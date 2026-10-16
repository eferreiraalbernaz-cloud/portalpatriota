"use client";

import { useState } from "react";
import type { ProviderConfigStatus } from "@/lib/integrations/provider-config";

export function ProviderSettings({ initial }: { initial: ProviderConfigStatus }) {
  const [status, setStatus] = useState(initial);
  const [appId, setAppId] = useState(initial.metaAppId);
  const [appSecret, setAppSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.openAiModel);
  const [busy, setBusy] = useState<"meta" | "openai" | null>(null);
  const [message, setMessage] = useState("");

  async function save(section: "meta" | "openai", clearCredentials = false) {
    setBusy(section); setMessage("");
    try {
      const payload = section === "meta"
        ? { section, metaAppId: appId, metaAppSecret: appSecret, clearCredentials }
        : { section, openAiApiKey: apiKey, openAiModel: model, clearCredentials };
      const response = await fetch("/api/admin/provider-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setStatus(result);
      if (section === "meta") setAppSecret(""); else setApiKey("");
      setMessage(section === "meta" ? "Credenciais da Meta salvas. Agora conecte a conta do Instagram." : "Configuração da IA salva.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(null); }
  }

  return <section className="admin-panel settings-panel provider-settings">
    <div className="panel-title-row"><div><span className="eyebrow">CONEXÕES DO PORTAL</span><h2>Configuração de APIs</h2></div></div>
    <p className="panel-intro">Configure cada serviço uma vez. As chaves são criptografadas antes de serem salvas e nunca aparecem novamente na tela.</p>
    {!status.encryptionReady && <div className="review-alert"><strong>Etapa técnica única</strong><p>O responsável pela implantação precisa cadastrar APP_SECRETS_ENCRYPTION_KEY nos segredos do servidor. Depois disso, o cliente poderá configurar estas integrações pelo painel.</p></div>}

    <div className="provider-card">
      <div className="panel-title-row"><div><span className="eyebrow">IMPORTAÇÃO AUTOMÁTICA</span><h3>Instagram · Meta</h3></div><span className={`status-pill ${status.metaConfigured ? "status-active" : "status-paused"}`}>{status.metaConfigured ? "APP CONFIGURADO" : "AGUARDANDO CONFIGURAÇÃO"}</span></div>
      <ol className="provider-steps"><li>Crie um aplicativo em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers ↗</a> e adicione Instagram API com Instagram Login.</li><li>No OAuth Redirect URI, cadastre exatamente o endereço abaixo. A URL não precisa ser copiada para outro campo do painel.</li><li>Informe o App ID e o App Secret. Depois, use <strong>Conectar Instagram</strong> na seção acima e autorize a conta profissional.</li></ol>
      <div className="settings-fields">
        <label>App ID<input value={appId} autoComplete="off" onChange={(event) => setAppId(event.target.value)} placeholder="ID do aplicativo Meta"/></label>
        <label>App Secret<input type="password" autoComplete="new-password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} placeholder={status.metaConfigured ? "Já salvo · preencha apenas para trocar" : "Cole o App Secret"}/></label>
        <label className="settings-wide">URL de retorno OAuth<input readOnly value={status.redirectUri}/><small>Copie esta URL para as configurações do aplicativo Meta.</small></label>
      </div>
      <div className="settings-save"><span className="inline-note">{status.metaConfigured ? "Credenciais protegidas e salvas." : "O App Secret não será exibido após salvar."}</span><div className="provider-actions"><button className="button button-outline" onClick={() => void save("meta", true)} disabled={busy !== null || !status.metaConfigured}>Remover</button><button className="button button-primary" onClick={() => void save("meta")} disabled={busy !== null || !status.encryptionReady}>{busy === "meta" ? "Salvando…" : "Salvar Meta"}</button></div></div>
    </div>

    <div className="provider-card">
      <div className="panel-title-row"><div><span className="eyebrow">REDAÇÃO INTELIGENTE</span><h3>IA e pesquisa</h3></div><span className={`status-pill ${status.openAiConfigured ? "status-active" : "status-paused"}`}>{status.openAiConfigured ? "CHAVE CONFIGURADA" : "AGUARDANDO CHAVE"}</span></div>
      <p className="panel-intro">Crie uma chave de API na conta do provedor de IA. O mesmo serviço executa a redação e a pesquisa quando essa opção está ativada.</p>
      <div className="settings-fields"><label className="settings-wide">Chave de API<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={status.openAiConfigured ? "Já salva · preencha apenas para trocar" : "Cole a chave de API"}/><small>A chave fica no servidor e não é enviada ao navegador de leitores.</small></label><label>Modelo<input value={model} maxLength={100} onChange={(event) => setModel(event.target.value)} placeholder="gpt-5-mini"/><small>Use um modelo habilitado na conta e compatível com pesquisa na web.</small></label></div>
      <div className="settings-save"><span className="inline-note">Configure a chave na conta do provedor e mantenha saldo/limites ativos.</span><div className="provider-actions"><button className="button button-outline" onClick={() => void save("openai", true)} disabled={busy !== null || !status.openAiConfigured}>Remover chave</button><button className="button button-primary" onClick={() => void save("openai")} disabled={busy !== null || !status.encryptionReady}>{busy === "openai" ? "Salvando…" : "Salvar IA"}</button></div></div>
    </div>
    {message && <p role="status" className={message.includes("não foi") || message.includes("precisa") ? "form-error" : "form-success"}>{message}</p>}
  </section>;
}
