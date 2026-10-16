import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORY_NAMES } from "@/lib/categories";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { removeManagedMedia } from "@/lib/storage-media";

function isSafeImageReference(value: string | null | undefined) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

const updateSchema = z.object({
  title: z.string().trim().min(5).max(180).optional(),
  subtitle: z.string().trim().max(280).nullable().optional(),
  body: z.string().max(50000).optional(),
  category: z.enum(CATEGORY_NAMES).optional(),
  image_url: z.string().trim().max(2048).nullable().optional().refine(isSafeImageReference),
  status: z.enum(["draft", "pending", "published", "scheduled", "archived"]).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  highlighted: z.boolean().optional(),
  needs_review: z.boolean().optional(),
  review_reason: z.string().max(1000).nullable().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return NextResponse.json({ error: "Dados da matéria inválidos." }, { status: 400 });
  const update = parsed.data;
  const payload: Record<string, unknown> = { ...update };
  const supabase = createServiceSupabaseClient();
  let previousImageUrl: string | null = null;
  const { data: existing, error: readError } = await supabase.from("articles").select("title,body,image_url,scheduled_at,needs_review").eq("id", id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Não foi possível carregar a matéria." }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 });
  const resultingBody = update.body ?? existing.body;
  if (["published", "scheduled"].includes(update.status || "") && resultingBody.trim().length < 40) return NextResponse.json({ error: "Inclua o texto da matéria antes de publicar ou agendar." }, { status: 400 });
  if (update.status === "scheduled") {
    const scheduledAt = update.scheduled_at ?? existing.scheduled_at;
    if (!scheduledAt || Date.parse(scheduledAt) <= Date.now()) return NextResponse.json({ error: "Escolha uma data futura para o agendamento." }, { status: 400 });
    if (existing.needs_review && update.needs_review !== false) return NextResponse.json({ error: "Conclua a verificação editorial antes de agendar esta matéria." }, { status: 400 });
    payload.scheduled_at = scheduledAt;
  }
  if (update.image_url === "") payload.image_url = null;
  if (update.status === "published") {
    payload.published_at = new Date().toISOString();
    payload.needs_review = false;
    payload.review_reason = null;
  }
  if (update.needs_review === false) payload.review_reason = null;
  if (update.status && update.status !== "scheduled") payload.scheduled_at = null;
  if (update.status === "archived") payload.archived_at = new Date().toISOString();
  if (typeof update.image_url === "string" || update.image_url === null) previousImageUrl = existing.image_url || null;
  const { data, error } = await supabase.from("articles").update(payload).eq("id", id).select("id,slug,status").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a matéria." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 });
  if (previousImageUrl && previousImageUrl !== update.image_url) await removeManagedMedia(previousImageUrl);
  return NextResponse.json({ article: data });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const { id } = await context.params;
  const supabase = createServiceSupabaseClient();
  const { data: existing } = await supabase.from("articles").select("image_url").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("articles").delete().eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível excluir a matéria." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 });
  await removeManagedMedia(existing?.image_url);
  return NextResponse.json({ ok: true });
}
