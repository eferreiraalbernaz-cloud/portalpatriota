"use client";

import { useState } from "react";
import type { CreativeAdminState } from "@/lib/ads/config";
import type { DirectLinkCreative } from "@/lib/ads/direct-link";
import { AdvertisementCard } from "@/components/advertisement-card";

export function DirectLinkSettings({ initial }: { initial: CreativeAdminState }) {
  const [creative, setCreative] = useState(initial.creative);
  const [savedEnabled, setSavedEnabled] = useState(initial.creative.enabled);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  function update<K extends keyof DirectLinkCreative>(key: K, value: DirectLinkCreative[K]) {
    setCreative((previous) => ({ ...previous, [key]: value,
      ...(key === "image_url" ? { enabled: false, review_confirmed: false } : {}),
    }));
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setFeedback(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");
      update("image_url", result.url);
      setFeedback({ error: false, text: "Imagem enviada. Revise o criativo e salve a configuração." });
    } catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "Falha ao enviar imagem." }); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/admin/advertising-creative", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creative),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar os cards.");
      setCreative(result.creative); setSavedEnabled(result.creative.enabled);
      setFeedback({ error: false, text: result.creative.enabled ? "Configuração habilitada. Confira o criativo nas páginas públicas." : "Rascunho salvo. Os cards estão desativados." });
    } catch (error) { setFeedback({ error: true, text: error instanceof Error ? error.message : "Falha ao salvar." }); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel settings-panel">
    <div className="panel-title-row"><div><span className="eyebrow">MONETIZAÇÃO · DIRECT LINK</span><h2>Cards publicitários</h2></div><span className={`status-pill ${savedEnabled ? "status-active" : "status-paused"}`}>{savedEnabled ? "CONFIGURAÇÃO HABILITADA" : "CARDS DESATIVADOS"}</span></div>
    <p className="panel-intro">Um card identificado como PUBLICIDADE após cada quatro notícias; nas grades com uma a três notícias, no máximo um card ao final. Nenhuma notícia é substituída. O link só abre por clique voluntário.</p>
    <p className="inline-note">O Direct Link pode selecionar ofertas diferentes por visitante. Use apenas um criativo autorizado e compatível com essa variação. Não anuncie marcas, produtos ou condições que não estejam confirmados. Substituir a imagem exige nova revisão e ativação.</p>
    {initial.error && <p role="alert" className="form-error">{initial.error}</p>}
    <div className="settings-fields">
      <label className="settings-wide">Enviar imagem publicitária<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || !initial.storageReady} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }}/><small>Use uma imagem real e autorizada. JPG, PNG, WebP ou AVIF de até 8 MB; prefira proporção 3:2.</small></label>
      <label className="settings-wide">URL da imagem<input value={creative.image_url} maxLength={2048} onChange={(event) => update("image_url", event.target.value)}/><small>Imagem do armazenamento do portal ou da pasta /ads/. Imagens que não carregarem ocultam o card.</small></label>
      <label>Título do anúncio<input value={creative.title} maxLength={100} onChange={(event) => update("title", event.target.value)}/></label>
      <label>URL publicitária (Direct Link)<input value={creative.target_url} maxLength={2048} onChange={(event) => update("target_url", event.target.value)}/><small>Direct Link HTTPS de uplcm.com/4/. Não cole scripts.</small></label>
      <label className="settings-wide">Descrição do anúncio<textarea value={creative.description} maxLength={240} onChange={(event) => update("description", event.target.value)}/><small>De 10 a 240 caracteres. A identificação PUBLICIDADE é adicionada automaticamente.</small></label>
      <label className="checkbox-field settings-wide"><input type="checkbox" checked={creative.review_confirmed} onChange={(event) => update("review_confirmed", event.target.checked)}/>Confirmei a zona e este uso no Monetag, tenho autorização para o criativo e verifiquei que imagem e texto correspondem às ofertas que o link pode entregar.</label>
      <label className="checkbox-field settings-wide"><input type="checkbox" checked={creative.enabled} onChange={(event) => update("enabled", event.target.checked)}/>Ativar cards publicitários nas páginas públicas</label>
    </div>
    <div className="creative-preview"><p className="inline-note">Prévia do conteúdo preenchido · link desabilitado</p><AdvertisementCard creative={creative} preview/></div>
    <div className="settings-save"><span className="inline-note">O In-Page Push 12271754 continua independente desta configuração.</span><button type="button" className="button button-primary" disabled={busy || !initial.storageReady} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar cards publicitários"}</button></div>
    {feedback && <p role="status" className={feedback.error ? "form-error" : "form-success"}>{feedback.text}</p>}
    <p className="inline-note"><a href="https://help.monetag.com/en/articles/6726647-direct-link-smart-link-direct-ads" target="_blank" rel="noreferrer">Uso oficial de Direct Link em imagens e links ↗</a></p>
  </section>;
}
