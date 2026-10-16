import "server-only";

import { randomUUID } from "node:crypto";
import { classifyCategory, writeNewsArticle } from "@/lib/ai/editor";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS, type PortalSettings, type WritingMode } from "@/lib/types";
import { decryptMetaToken, encryptMetaToken } from "@/lib/instagram/crypto";
import { graphGet, refreshInstagramToken, type InstagramMedia } from "@/lib/instagram/api";
import { isInstagramMediaUrl } from "@/lib/ai/editor";
import { slugify } from "@/lib/slugify";

type Integration = {
  id: number;
  ig_user_id: string;
  username: string;
  token_ciphertext: string;
  token_iv: string;
  token_auth_tag: string;
  token_expires_at: string | null;
  last_refresh_attempt_at: string | null;
  last_synced_at: string | null;
  status: string;
};

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

async function logProcessing(client: ServiceClient, articleId: string | null, stage: string, status: "success" | "warning" | "failed", message: string, details: Record<string, unknown> = {}) {
  await client.from("article_processing_logs").insert({ article_id: articleId, stage, status, message, details });
}

async function loadSettings(client: ServiceClient): Promise<PortalSettings> {
  const { data } = await client.from("portal_settings").select("*").eq("id", 1).maybeSingle();
  return data ? { ...DEFAULT_SETTINGS, ...data } as PortalSettings : DEFAULT_SETTINGS;
}

async function mirrorImage(client: ServiceClient, articleId: string, url?: string | null) {
  if (!url || !isInstagramMediaUrl(url)) return url || null;
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return url;
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
    const extension = extensionByType[contentType];
    const length = Number(response.headers.get("content-length") || 0);
    if (!extension || (length > 8 * 1024 * 1024)) return url;
    if (!response.body) return url;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 8 * 1024 * 1024) { await reader.cancel(); return url; }
      chunks.push(value);
    }
    if (!total) return url;
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const path = `instagram/${articleId}.${extension}`;
    const { error } = await client.storage.from("portal-media").upload(path, bytes, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) {
      console.warn("Não foi possível armazenar mídia do Instagram.", { articleId, code: error.name });
      return url;
    }
    return client.storage.from("portal-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return url;
  }
}

function captionTitle(caption: string) {
  const firstLine = caption.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "Nova publicação do Portal Patriota BR";
  return firstLine.replace(/^#+\s*/, "").replace(/\s+/g, " ").slice(0, 160);
}

async function processArticle(client: ServiceClient, articleId: string, settings?: PortalSettings) {
  const { data: claim, error: claimError } = await client.from("articles")
    .update({ ai_status: "processing" })
    .eq("id", articleId)
    .eq("ai_status", "queued")
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error("Não foi possível reservar a publicação para processamento.");
  if (!claim) return { published: false, needsReview: true, skipped: true };

  const portalSettings = settings || await loadSettings(client);
  const { data: article, error } = await client.from("articles").select("*").eq("id", articleId).single();
  if (error || !article) throw new Error("A publicação importada não foi encontrada.");
  const caption = String(article.original_caption || "").trim();
  const lightCategory = classifyCategory(`${article.title}\n${caption}`);

  if (portalSettings.writing_mode === "off") {
    const hasContent = Boolean(caption);
    const requiresReview = !hasContent || lightCategory.ambiguous;
    const publish = portalSettings.auto_publish && !requiresReview;
    const body = caption || "O Instagram não disponibilizou uma legenda para esta publicação. Consulte a publicação original no Instagram.";
    const update = await client.from("articles").update({
      category: lightCategory.category,
      title: captionTitle(caption || String(article.title)),
      subtitle: "",
      body,
      sources: [],
      ai_status: "skipped",
      ai_confidence: null,
      needs_review: requiresReview,
      review_reason: !hasContent ? "Publicação sem legenda disponível." : lightCategory.reason,
      status: publish ? "published" : "pending",
      published_at: publish ? new Date().toISOString() : null,
    }).eq("id", articleId);
    if (update.error) throw new Error("Não foi possível salvar a matéria importada.");
    await logProcessing(client, articleId, "formatting", requiresReview ? "warning" : "success", requiresReview ? lightCategory.reason || "A publicação precisa de revisão." : "Legenda original organizada sem expansão por IA.", { category: lightCategory.category, mode: "off" });
    return { published: publish, needsReview: requiresReview };
  }

  try {
    const draft = await writeNewsArticle({
      caption,
      imageUrl: article.image_url,
      mode: portalSettings.writing_mode as Exclude<WritingMode, "off">,
    });
    const publish = portalSettings.auto_publish && !draft.needsReview && draft.body.length > 200 && draft.sources.length >= 2;
    const status = publish ? "published" : "pending";
    const saved = await client.from("articles").update({
      title: draft.title || captionTitle(caption),
      subtitle: draft.subtitle,
      body: draft.body || caption,
      category: draft.category,
      sources: draft.sources,
      ai_status: "completed",
      ai_confidence: draft.confidence,
      needs_review: draft.needsReview,
      review_reason: draft.reviewReason,
      status,
      published_at: publish ? new Date().toISOString() : null,
    }).eq("id", articleId);
    if (saved.error) throw new Error("Não foi possível salvar a matéria processada.");
    await logProcessing(client, articleId, "editorial_review", draft.needsReview ? "warning" : "success", draft.reviewReason || (publish ? "Matéria liberada e publicada automaticamente." : "Matéria pronta para revisão editorial."), { confidence: draft.confidence, source_count: draft.sources.length, category: draft.category, auto_published: publish });
    return { published: publish, needsReview: draft.needsReview };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Falha inesperada no processamento editorial.";
    await client.from("articles").update({
      ai_status: "failed",
      status: "pending",
      needs_review: true,
      review_reason: reason,
    }).eq("id", articleId);
    await logProcessing(client, articleId, "ai_research_and_writing", "failed", reason);
    return { published: false, needsReview: true, error: reason };
  }
}

async function storeRefreshedToken(client: ServiceClient, integration: Integration, token: string, expiresIn: number) {
  const encrypted = encryptMetaToken(token);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  await client.from("instagram_integrations").update({
    token_ciphertext: encrypted.ciphertext,
    token_iv: encrypted.iv,
    token_auth_tag: encrypted.authTag,
    token_expires_at: expiresAt,
    last_refresh_attempt_at: new Date().toISOString(),
    status: "connected",
  }).eq("id", integration.id);
  return { ...integration, token_ciphertext: encrypted.ciphertext, token_iv: encrypted.iv, token_auth_tag: encrypted.authTag, token_expires_at: expiresAt, last_refresh_attempt_at: new Date().toISOString(), status: "connected" };
}

async function getUsableToken(client: ServiceClient, integration: Integration) {
  let token = decryptMetaToken(integration);
  const expiry = integration.token_expires_at ? Date.parse(integration.token_expires_at) : 0;
  const lastAttempt = integration.last_refresh_attempt_at ? Date.parse(integration.last_refresh_attempt_at) : 0;
  const refreshDue = expiry > 0 && expiry - Date.now() < 14 * 24 * 60 * 60 * 1000 && Date.now() - lastAttempt > 24 * 60 * 60 * 1000;
  if (refreshDue) {
    const refreshed = await refreshInstagramToken(token);
    token = refreshed.access_token;
    integration = await storeRefreshedToken(client, integration, token, refreshed.expires_in);
  }
  return { token, integration };
}

async function writeIntegrationError(client: ServiceClient, message: string, requiresReauthorization = false) {
  const state = requiresReauthorization ? "reauthorization_required" : "error";
  await client.from("instagram_integrations").update({ status: state, last_error: message }).eq("id", 1);
}

export async function syncInstagramPosts(options: { manual?: boolean } = {}) {
  const client = createServiceSupabaseClient();
  const settings = await loadSettings(client);
  if (settings.sync_paused && !options.manual) return { status: "skipped", message: "Sincronização pausada nas configurações." };
  const { data: currentIntegration, error } = await client.from("instagram_integrations").select("*").eq("id", 1).maybeSingle();
  if (error || !currentIntegration) return { status: "skipped", message: "Conta do Instagram ainda não conectada." };

  let integration = currentIntegration as Integration;
  let token: string;
  try {
    ({ token, integration } = await getUsableToken(client, integration));
  } catch (error) {
    const message = error instanceof Error ? error.message : "O token do Instagram não pôde ser renovado.";
    await writeIntegrationError(client, message, true);
    return { status: "failed", message, reauthorizationRequired: true };
  }

  const run = await client.from("automation_runs").insert({ kind: options.manual ? "manual_sync" : "instagram_sync", status: "running", message: "Consultando publicações recentes do Instagram." }).select("id").single();
  const runId = run.data?.id;
  const media: InstagramMedia[] = [];
  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    let after: string | undefined;
    for (let page = 0; page < 3; page += 1) {
      const result = await graphGet<{ data?: InstagramMedia[]; paging?: { cursors?: { after?: string }; next?: string } }>("me/media", token, {
        fields,
        limit: "100",
        ...(after ? { after } : {}),
      });
      const batch = result.data || [];
      media.push(...batch);
      const cursors = result.paging?.cursors;
      if (!result.paging?.next || !cursors?.after || batch.length === 0) break;
      after = cursors.after;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar as publicações da Meta.";
    await writeIntegrationError(client, message, /token|permission|authorized|OAuth|access/i.test(message));
    if (runId) await client.from("automation_runs").update({ status: "failed", message, finished_at: new Date().toISOString() }).eq("id", runId);
    return { status: "failed", message };
  }

  const deduped = Array.from(new Map(media.filter((item) => item.id).map((item) => [item.id, item])).values());
  const prepared = deduped.map((item) => {
    const caption = String(item.caption || "").trim();
    const classification = classifyCategory(`${caption}\n${item.media_type || ""}`);
    return {
      slug: `${slugify(captionTitle(caption))}-${slugify(item.id.slice(-8))}`,
      category: classification.category,
      title: captionTitle(caption),
      subtitle: null,
      body: caption || "",
      image_url: item.media_type === "VIDEO" ? item.thumbnail_url || null : item.media_url || item.thumbnail_url || null,
      status: "pending",
      highlighted: false,
      needs_review: true,
      review_reason: classification.reason || "Aguardando processamento editorial.",
      sources: [],
      ai_status: "queued",
      instagram_url: item.permalink || null,
      instagram_media_id: item.id,
      original_caption: caption || null,
      original_published_at: item.timestamp || null,
    };
  });
  let inserted: Array<{ id: string; instagram_media_id: string }> = [];
  if (prepared.length) {
    const { data, error: insertError } = await client.from("articles").upsert(prepared, { onConflict: "instagram_media_id", ignoreDuplicates: true }).select("id,instagram_media_id");
    if (insertError) {
      const message = "As publicações foram recebidas, mas não puderam ser registradas no banco de dados.";
      console.error(message, { code: insertError.code });
      if (runId) await client.from("automation_runs").update({ status: "failed", message, finished_at: new Date().toISOString() }).eq("id", runId);
      return { status: "failed", message };
    }
    inserted = (data || []) as Array<{ id: string; instagram_media_id: string }>;
  }

  const mediaById = new Map(deduped.map((item) => [item.id, item]));
  let publishedCount = 0;
  const failures: string[] = [];
  // Recover work interrupted by a function timeout or deployment restart.
  const staleProcessingBefore = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { error: recoveryError } = await client.from("articles")
    .update({ ai_status: "queued", status: "pending", needs_review: true, review_reason: "Processamento interrompido; o sistema retomará esta publicação." })
    .eq("ai_status", "processing")
    .lt("updated_at", staleProcessingBefore);
  if (recoveryError) failures.push("A fila interrompida não pôde ser recuperada.");
  const { data: queued, error: queuedError } = await client.from("articles").select("id,instagram_media_id,image_url").eq("ai_status", "queued").order("created_at", { ascending: true }).limit(3);
  if (queuedError) failures.push("A fila de processamento não pôde ser carregada.");
  for (const row of queued || []) {
    const original = mediaById.get(row.instagram_media_id || "");
    const sourceImage = original ? (original.media_type === "VIDEO" ? original.thumbnail_url : original.media_url || original.thumbnail_url) : row.image_url;
    if (sourceImage) {
      const imageUrl = await mirrorImage(client, row.id, sourceImage);
      if (imageUrl && imageUrl !== row.image_url) await client.from("articles").update({ image_url: imageUrl }).eq("id", row.id);
    }
    const result = await processArticle(client, row.id, settings);
    if (result.published) publishedCount += 1;
    if (result.error) failures.push(result.error);
  }

  const syncTime = new Date().toISOString();
  await client.from("instagram_integrations").update({ last_synced_at: syncTime, last_error: null, status: "connected" }).eq("id", 1);
  const status = failures.length ? (inserted.length || (queued?.length || 0) > failures.length ? "partial" : "failed") : "success";
  const message = `${inserted.length} nova(s) publicação(ões) importada(s); ${queued?.length || 0} item(ns) processado(s) nesta rodada; ${publishedCount} publicada(s) automaticamente.`;
  if (runId) await client.from("automation_runs").update({ status, imported_count: inserted.length, published_count: publishedCount, message, details: { media_seen: deduped.length, queued_processed: queued?.length || 0, queued_remaining: Math.max(0, deduped.length - (queued?.length || 0)), failures: failures.slice(0, 10) }, finished_at: syncTime }).eq("id", runId);
  return { status, imported: inserted.length, processed: queued?.length || 0, published: publishedCount, message, failures: failures.slice(0, 10) };
}

export async function reprocessArticle(articleId: string) {
  const client = createServiceSupabaseClient();
  const settings = await loadSettings(client);
  const { data, error } = await client.from("articles")
    .update({ ai_status: "queued", status: "pending", needs_review: true, review_reason: "Reprocessamento solicitado pelo administrador." })
    .eq("id", articleId)
    .in("ai_status", ["failed", "completed", "skipped"])
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("A matéria está sendo processada ou não está disponível para reprocessamento.");
  return processArticle(client, articleId, settings);
}

export async function publishDueArticles() {
  const client = createServiceSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client.from("articles").update({ status: "published", published_at: now, needs_review: false, review_reason: null }).eq("status", "scheduled").lte("scheduled_at", now).eq("needs_review", false).select("id");
  if (error) throw new Error("Não foi possível publicar as matérias agendadas.");
  return data?.length || 0;
}

export async function runScheduledAutomation() {
  const client = createServiceSupabaseClient();
  const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [oldRuns, oldLogs] = await Promise.all([
    client.from("automation_runs").delete().lt("started_at", retentionCutoff),
    client.from("article_processing_logs").delete().lt("created_at", retentionCutoff),
  ]);
  if (oldRuns.error || oldLogs.error) console.warn("O histórico operacional antigo não foi totalmente removido.", { runs: oldRuns.error?.code, logs: oldLogs.error?.code });
  const scheduledCount = await publishDueArticles();
  const syncResult = await syncInstagramPosts();
  return { scheduledPublished: scheduledCount, sync: syncResult };
}

export function newOAuthState() {
  return randomUUID();
}
