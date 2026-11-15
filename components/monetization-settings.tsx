"use client";

import { useState } from "react";
import { MONETAG_ACTIVATION_BLOCK, type MonetizationStatus } from "@/lib/monetization";

export function MonetizationSettings({ initial }: { initial: MonetizationStatus }) {
  const [zoneId, setZoneId] = useState(initial.zoneId);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/admin/monetization", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false, zoneId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar a monetização.");
      setZoneId(result.zoneId);
      setFeedback({ error: false, text: "Configuração salva. Os anúncios permanecem desativados; o Zone ID não comprova o formato." });
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : "Não foi possível salvar." });
    } finally { setBusy(false); }
  }

  return <section className="admin-panel settings-panel">
    <div className="panel-title-row"><div><span className="eyebrow">PUBLICIDADE</span><h2>Monetização</h2></div><span className="status-pill status-paused">DESATIVADA · TAG PENDENTE</span></div>
    <p className="panel-intro">Formato permitido: exclusivamente In-Page Push do Monetag. Nenhum anúncio está instalado nesta etapa.</p>
    <div className="review-alert"><strong>Tag In-Page Push necessária</strong><p>{MONETAG_ACTIVATION_BLOCK}</p></div>
    <ol className="provider-steps">
      <li>No Monetag, abra Websites e selecione o domínio público do portal.</li>
      <li>Crie ou selecione uma zona <strong>In-Page Push (Banner)</strong> e clique em <strong>Get tag</strong>. Não selecione Push Notifications ou MultiTag.</li>
      <li>Envie a tag JavaScript completa ao responsável técnico para validar o formato e implementar o carregamento e o consentimento antes da ativação.</li>
    </ol>
    {initial.error && <p role="alert" className="form-error">{initial.error}</p>}
    <div className="settings-fields">
      <label>Zone ID da zona In-Page Push<input value={zoneId} inputMode="numeric" maxLength={20} autoComplete="off" onChange={(event) => setZoneId(event.target.value)} placeholder="Aguardando zona In-Page Push"/><small>Opcional nesta etapa. O ID 12194090 recebido com o Service Worker não foi validado como In-Page Push.</small></label>
      <label>Origem pública configurada<input readOnly value={initial.siteOrigin || "Não configurada"}/><small>Origem de NEXT_PUBLIC_SITE_URL. A associação à zona deve ser confirmada no painel Monetag.</small></label>
    </div>
    <div className="toggle-list"><label className="toggle-row"><span><strong>Ativar anúncios In-Page Push</strong><small id="monetag-block">Indisponível até validar a tag, o domínio e o fluxo de privacidade. Salvar mantém os anúncios desativados.</small></span><input type="checkbox" checked={false} disabled aria-describedby="monetag-block"/><i aria-hidden="true"/></label></div>
    <div className="settings-save"><span className="inline-note">Nenhum Service Worker de publicidade foi registrado ou alterado.</span><button type="button" className="button button-primary" onClick={() => void save()} disabled={busy || !initial.storageReady}>{busy ? "Salvando…" : "Salvar e manter desativado"}</button></div>
    {feedback && <p role="status" className={feedback.error ? "form-error" : "form-success"}>{feedback.text}</p>}
    <p className="inline-note"><a href="https://help.monetag.com/en/articles/6959534-in-page-push-ipp" target="_blank" rel="noreferrer">Instruções oficiais do Monetag ↗</a></p>
  </section>;
}
