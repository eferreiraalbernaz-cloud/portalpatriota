"use client";

import { useState } from "react";
import type { IntegrationStatus, PortalSettings, WritingMode } from "@/lib/types";
import { DisconnectInstagramButton, SyncButton } from "@/components/admin-actions";

const writingOptions: { value: WritingMode; title: string; detail: string }[] = [
  { value: "short", title: "Redação curta", detail: "Aproximadamente 200 a 350 palavras." },
  { value: "medium", title: "Redação média", detail: "Aproximadamente 400 a 700 palavras. Opção padrão." },
  { value: "long", title: "Redação longa", detail: "Aproximadamente 800 a 1.200 palavras." },
  { value: "off", title: "Desativar redação inteligente", detail: "Organiza a legenda original sem pesquisar nem expandir." },
];

export function SettingsForm({ initial, integration, message }: { initial: PortalSettings; integration: IntegrationStatus; message?: string }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [feedback, setFeedback] = useState(message || "");
  const update = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setFeedback("Configurações salvas.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setLogoBusy(true); setFeedback("");
    const form = new FormData(); form.set("file", file);
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a logomarca.");
      update("logo_url", result.url); setFeedback("Logomarca enviada. Salve as configurações para aplicar.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível enviar a logomarca."); }
    finally { setLogoBusy(false); }
  };

  return <div className="settings-stack">
    <section className="admin-panel settings-panel"><div className="panel-title-row"><div><span className="eyebrow">AUTOMAÇÃO EDITORIAL</span><h2>Redação inteligente</h2></div><span className={`status-pill ${settings.auto_publish ? "status-active" : "status-paused"}`}>{settings.auto_publish ? "PUBLICAÇÃO ATIVA" : "PUBLICAÇÃO PAUSADA"}</span></div>
      <p className="panel-intro">Defina o tamanho da matéria e o comportamento padrão do fluxo Instagram → pesquisa → redação → publicação.</p>
      <div className="writing-options">{writingOptions.map((option) => <label className={`writing-option${settings.writing_mode === option.value ? " selected" : ""}`} key={option.value}><input type="radio" name="writing_mode" value={option.value} checked={settings.writing_mode === option.value} onChange={() => update("writing_mode", option.value)}/><span className="radio-mark"/><span><strong>{option.title}</strong><small>{option.detail}</small></span></label>)}</div>
      <div className="toggle-list"><label className="toggle-row"><span><strong>Publicação automática</strong><small>Publica apenas matérias que passam pelas verificações editoriais. Itens com falha permanecem pendentes.</small></span><input type="checkbox" checked={settings.auto_publish} onChange={(event) => update("auto_publish", event.target.checked)}/><i/></label><label className="toggle-row"><span><strong>Pausar sincronização</strong><small>Interrompe a importação automática. A sincronização manual continua disponível.</small></span><input type="checkbox" checked={settings.sync_paused} onChange={(event) => update("sync_paused", event.target.checked)}/><i/></label></div>
    </section>

    <section className="admin-panel settings-panel"><div className="panel-title-row"><div><span className="eyebrow">CONTA OFICIAL</span><h2>Instagram</h2></div><span className={`status-pill ${integration.connected ? "status-active" : "status-paused"}`}>{integration.connected ? "CONECTADO" : "NÃO CONECTADO"}</span></div>
      <p className="panel-intro">Conexão pelo Instagram Login for Business da Meta. Tokens armazenados com criptografia AES-256-GCM.</p>
      {integration.connected ? <div className="integration-summary"><div><small>CONTA CONECTADA</small><strong>@{integration.username}</strong></div><div><small>ÚLTIMA SINCRONIZAÇÃO</small><strong>{integration.last_synced_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(integration.last_synced_at)) : "Ainda não sincronizado"}</strong></div></div> : <p className="inline-note">Conecte uma conta profissional do Instagram (Business ou Creator) para começar a importar publicações.</p>}
      {integration.last_error && <p className="form-error">{integration.last_error}</p>}
      <div className="panel-actions"><a className="button button-outline" href="/api/instagram/connect">{integration.connected ? "Reconectar Instagram" : "Conectar Instagram"} <span>↗</span></a><SyncButton disabled={!integration.connected}/>{integration.connected && <DisconnectInstagramButton/>}</div>
    </section>

    <section className="admin-panel settings-panel"><div className="panel-title-row"><div><span className="eyebrow">IDENTIDADE</span><h2>Configurações gerais</h2></div></div>
      <div className="settings-fields">
        <label>Nome do portal<input value={settings.site_name} maxLength={80} onChange={(event) => update("site_name", event.target.value)}/></label>
        <div className="settings-wide"><label htmlFor="logo-url">Logomarca</label><div className="image-upload-row"><input id="logo-url" value={settings.logo_url} maxLength={2048} onChange={(event) => update("logo_url", event.target.value)}/><label className="button button-outline upload-label">{logoBusy ? "Enviando…" : "Enviar imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={logoBusy} onChange={(event) => void uploadLogo(event.target.files?.[0])}/></label></div><small>Informe um endereço ou envie JPG, PNG, WebP ou AVIF de até 8 MB.</small></div>
        <label>Instagram<input value={settings.instagram_url} placeholder="https://www.instagram.com/..." onChange={(event) => update("instagram_url", event.target.value)}/></label>
        <label>Facebook<input value={settings.facebook_url} placeholder="https://facebook.com/..." onChange={(event) => update("facebook_url", event.target.value)}/></label>
        <label>YouTube<input value={settings.youtube_url} placeholder="https://youtube.com/..." onChange={(event) => update("youtube_url", event.target.value)}/></label>
        <label>Contato comercial ALBR<input value={settings.albr_contact_url} placeholder="https://..." onChange={(event) => update("albr_contact_url", event.target.value)}/></label>
        <label className="settings-wide">Texto institucional<textarea rows={3} maxLength={500} value={settings.institutional_text} onChange={(event) => update("institutional_text", event.target.value)}/></label>
      </div>
      <div className="settings-save"><div>{feedback && <span role="status" className={feedback.includes("não") || feedback.includes("inválid") ? "form-error" : "form-success"}>{feedback}</span>}</div><button className="button button-primary" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar configurações"}</button></div>
    </section>
    <p className="admin-small-note">As credenciais dos provedores são configuradas na seção abaixo. O acesso administrativo continua protegido pelo Supabase Auth.</p>
  </div>;
}
