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
      <