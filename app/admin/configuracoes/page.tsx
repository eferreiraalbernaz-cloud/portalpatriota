import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { SettingsForm } from "@/components/settings-form";
import { getAdminSession } from "@/lib/admin-auth";
import { DEFAULT_SETTINGS, type IntegrationStatus, type PortalSettings } from "@/lib/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isAdminBackendConfigured } from "@/lib/config";
import { providerConfigStatus, readProviderRow } from "@/lib/integrations/provider-config";
import { ProviderSettings } from "@/components/provider-settings";

const statusMessage: Record<string, string> = {
  connected: "Conta do Instagram conectada com sucesso.",
  denied: "A autorização foi cancelada no Instagram.",
  "state-error": "A validação de segurança da conexão falhou. Tente conectar novamente.",
  "not-configured": "Configure o App ID e o App Secret da Meta na seção Configuração de APIs.",
  "invalid-callback": "A URL de retorno precisa usar o domínio configurado em NEXT_PUBLIC_SITE_URL.",
  "connection-error": "Não foi possível concluir a conexão. Confira as credenciais e os logs do servidor.",
};

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ instagram?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  if (!isAdminBackendConfigured()) return <AdminShell email={admin.email} title="Configurações"><p className="form-error">Configure a chave privada do Supabase no servidor antes de usar as configurações.</p></AdminShell>;
  const supabase = createServiceSupabaseClient();
  const [settingsResult, integrationResult, runsResult, providerRow, query] = await Promise.all([
    supabase.from("portal_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("instagram_integrations").select("username,last_synced_at,last_error,token_expires_at,status").eq("id", 1).maybeSingle(),
    supabase.from("automation_runs").select("id,kind,status,message,started_at,imported_count,published_count").order("started_at", { ascending: false }).limit(10),
    readProviderRow(),
    searchParams,
  ]);
  const settings = settingsResult.data;
  const integration = integrationResult.data;
  const runs = runsResult.data;
  const integrationStatus: IntegrationStatus = integration ? { connected: integration.status === "connected", username: integration.username, last_synced_at: integration.last_synced_at, last_error: integration.last_error, token_expires_at: integration.token_expires_at } : { connected: false };
  const message = query.instagram ? statusMessage[query.instagram] || "" : "";
  return <AdminShell email={admin.email} title="Configurações" eyebrow="AUTOMAÇÃO E IDENTIDADE"><SettingsForm initial={{ ...DEFAULT_SETTINGS, ...(settings || {}) } as PortalSettings} integration={integrationStatus} message={message}/><ProviderSettings initial={providerConfigStatus(providerRow)}/><section className="admin-panel automation-history-panel"><div className="panel-title-row"><div><span className="eyebrow">REGISTROS</span><h2>Histórico da automação</h2></div></div>{runs?.length ? <div className="automation-history-list">{runs.map((run) => <div className="automation-history-row" key={run.id}><span className={`article-status status-${run.status === "success" ? "published" : run.status === "failed" ? "pending" : "draft"}`}>{run.status}</span><div><strong>{run.kind.replaceAll("_", " ")}</strong><p>{run.message || "Execução concluída."}</p></div><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(run.started_at))}</small></div>)}</div> : <p className="inline-note">As execuções agendadas aparecerão aqui quando a automação estiver configurada.</p>}</section></AdminShell>;
}
