"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type CategoryName } from "@/lib/categories";
import type { Article, ArticleStatus, ProcessingLog } from "@/lib/types";

type EditorValues = {
  title: string;
  subtitle: string;
  body: string;
  category: CategoryName;
  image_url: string;
  status: ArticleStatus;
  scheduled_at: string;
  highlighted: boolean;
  review_reason: string;
  needs_review: boolean;
};

export function ArticleForm({ article, processingLogs = [] }: { article?: Article; processingLogs?: ProcessingLog[] }) {
  const router = useRouter();
  const [form, setForm] = useState<EditorValues>({
    title: article?.title || "",
    subtitle: article?.subtitle || "",
    body: article?.body || "",
    category: article?.category || "BRASIL",
    image_url: article?.image_url || "",
    status: article?.status || "draft",
    scheduled_at: article?.scheduled_at ? new Date(new Date(article.scheduled_at).getTime() - new Date(article.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0,16) : "",
    highlighted: article?.highlighted || false,
    review_reason: article?.review_reason || "",
    needs_review: article?.needs_review || false,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const update = <K extends keyof EditorValues>(key: K, value: EditorValues[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true); setMessage("");
    const payload = { ...form, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null, image_url: form.image_url || null, subtitle: form.subtitle || null, review_reason: form.review_reason || null };
    try {
      const response = await fetch(article ? `/api/admin/articles/${article.id}` : "/api/admin/articles", { method: article ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar a matéria.");
      setMessage("Matéria salva.");
      if (!article && result.article?.id) router.replace(`/admin/noticias/${result.article.id}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a matéria."); }
    finally { setBusy(false); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploadBusy(true); setMessage("");
    const data = new FormData(); data.set("file", file);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao enviar imagem.");
      update("image_url", result.url); setMessage("Imagem enviada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao enviar imagem."); }
    finally { setUploadBusy(false); }
  };

  const runAction = async (url: string, method: "POST" | "DELETE", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || "A ação não foi concluída.");
      if (url.includes("/publish")) { update("status", "published"); update("needs_review", false); setMessage("Matéria publicada."); }
      else if (method === "DELETE") { router.replace("/admin/noticias"); }
      else { setMessage(result.published ? "Reprocessada e publicada após as verificações." : result.needsReview ? "Reprocessada e encaminhada para revisão." : "Reprocessamento concluído."); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "A ação não foi concluída."); }
    finally { setBusy(false); }
  };

  return <div className="article-edit-layout"><section className="admin-panel article-editor-panel">
    <div className="settings-fields">
      <label className="settings-wide">Título<input value={form.title} minLength={5} maxLength={180} onChange={(event) => update("title", event.target.value)}/></label>
      <label className="settings-wide">Subtítulo<input value={form.subtitle} maxLength={280} onChange={(event) => update("subtitle", event.target.value)}/></label>
      <label>Categoria<select value={form.category} onChange={(event) => update("category", event.target.value as CategoryName)}>{CATEGORIES.map((category) => <option key={category.slug} value={category.name}>{category.name}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value as ArticleStatus)}><option value="draft">Rascunho</option><option value="pending">Pendente</option><option value="published">Publicado</option><option value="scheduled">Agendado</option><option value="archived">Arquivado</option></select></label>
      {form.status === "scheduled" && <label>Data e horário<input type="datetime-local" value={form.scheduled_at} onChange={(event) => update("scheduled_at", event.target.value)}/></label>}
      <label className="settings-wide">Texto da matéria<textarea rows={18} maxLength={50000} value={form.body} onChange={(event) => update("body", event.target.value)}/><small>O texto é exibido como conteúdo simples, sem executar HTML.</small></label>
      <div className="settings-wide"><label htmlFor="article-image-url">Imagem principal</label><div className="image-upload-row"><input id="article-image-url" value={form.image_url} placeholder="URL da imagem ou envie um arquivo" onChange={(event) => update("image_url", event.target.value)}/><label className="button button-outline upload-label">{uploadBusy ? "Enviando…" : "Enviar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadBusy} onChange={(event) => void upload(event.target.files?.[0])}/></label></div><small>JPG, PNG, WebP ou AVIF, até 8 MB.</small></div>
      {article?.instagram_url && <div className="settings-wide original-post"><span className="eyebrow">PUBLICAÇÃO ORIGINAL</span><a href={article.instagram_url} target="_blank" rel="noreferrer">Abrir publicação no Instagram ↗</a></div>}
      {article?.sources?.length ? <div className="settings-wide original-post"><span className="eyebrow">FONTES DA MATÉRIA</span>{article.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">{source.title || source.url} ↗</a>)}</div> : null}
      {article?.needs_review && <div className="settings-wide review-alert"><strong>Revisão necessária</strong><p>{article.review_reason || "Esta matéria aguarda verificação editorial."}</p></div>}
      {article?.instagram_media_id && <label className="checkbox-field settings-wide"><input type="checkbox" checked={!form.needs_review} onChange={(event) => update("needs_review", !event.target.checked)}/> Verificação editorial concluída</label>}
      <label className="checkbox-field settings-wide"><input type="checkbox" checked={form.highlighted} onChange={(event) => update("highlighted", event.target.checked)}/> Destacar na página inicial</label>
    </div>
    <div className="editor-bottom"><div>{message && <span className={message.includes("não") || message.includes("falha") ? "form-error" : "form-success"} role="status">{message}</span>}</div><div className="editor-actions"><button className="button button-outline" onClick={() => router.push("/admin/noticias")} disabled={busy}>Cancelar</button><button className="button button-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar matéria"}</button></div></div>
  </section>
  {article && <aside className="admin-panel editor-side-panel"><span className="eyebrow">AÇÕES</span><h2>Gerenciar matéria</h2><button className="button button-primary button-full" onClick={() => void runAction(`/api/admin/articles/${article.id}/publish`, "POST")} disabled={busy}>Publicar agora</button>{article.instagram_media_id && <button className="button button-outline button-full" onClick={() => void runAction(`/api/admin/articles/${article.id}/reprocess`, "POST")} disabled={busy}>Reprocessar com IA</button>}<button className="button button-danger button-full" onClick={() => void runAction(`/api/admin/articles/${article.id}`, "DELETE", "Excluir esta matéria permanentemente?")} disabled={busy}>Excluir matéria</button><small>Endereço público: /{CATEGORIES.find((item) => item.name === form.category)?.slug}/{article.slug}</small><div className="processing-history"><span className="eyebrow">HISTÓRICO DE PROCESSAMENTO</span>{processingLogs.length ? processingLogs.map((log) => <div className="processing-log" key={log.id}><span className={`processing-log-dot log-${log.status}`}/><div><strong>{log.stage.replaceAll("_", " ")}</strong><p>{log.message}</p><time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(log.created_at))}</time></div></div>) : <small>Nenhuma etapa registrada ainda.</small>}</div></aside>}
  </div>;
}
