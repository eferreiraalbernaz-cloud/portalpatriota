import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAdminSession } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/types";

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const supabase = createServiceSupabaseClient();
  const statuses = ["published", "draft", "pending", "scheduled"] as const;
  const counts = await Promise.all(statuses.map(async (status) => {
    const { count } = await supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", status);
    return [status, count || 0] as const;
  }));
  const [totalResult, settingsResult, integrationResult, latestRunResult, recentArticlesResult] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("portal_settings").select("auto_publish,sync_paused,writing_mode").eq("id", 1).maybeSingle(),
    supabase.from("instagram_integrations").select("username,last_synced_at,last_error,status").eq("id", 1).maybeSingle(),
    supabase.from("automation_runs").select("status,message,started_at,imported_count,published_count").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("articles").select("id,title,category,status,created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const totals = Object.fromEntries(counts);
  const totalCount = totalResult.count;
  const settings = settingsResult.data;
  const integration = integrationResult.data;
  const latestRun = latestRunResult.data;
  const recentArticles = recentArticlesResult.data;
  const currentSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return <AdminShell email={admin.email} title="Visão geral" eyebrow="BOM DIA, REDAÇÃO">
    <section className="dashboard-welcome"><div><span className="eyebrow">CENTRAL DE OPERAÇÕES</span><h2>Seu portal, em um só lugar.</h2><p>Acompanhe as publicações, a automação e a atividade editorial.</p></div><Link href="/admin/noticias/nova" className="button button-primary">Nova matéria <span>＋</span></Link></section>
    <div className="stat-grid">{[["Total de notícias", totalCount || 0, "▤", ""], ["Matérias publicadas", totals.published || 0, "↗", "stat-blue"], ["Rascunhos", totals.draft || 0, "◷", ""], ["Aguardando revisão", totals.pending || 0, "!", "stat-yellow"], ["Agendadas", totals.scheduled || 0, "◷", ""]].map(([label, count, icon, cls]) => <div className={`stat-card ${cls}`} key={label}><div><span>{label}</span><b>{count}</b></div><i>{icon}</i></div>)}</div>
    <div className="dashboard-grid"><section className="admin-panel automation-panel"><div className="panel-title-row"><div><span className="eyebrow">STATUS DO SISTEMA</span><h2>Automação</h2></div><span className={`status-pill ${!currentSettings.sync_paused && integration?.status === "connected" ? "status-active" : "status-paused"}`}>{!currentSettings.sync_paused && integration?.status === "connected" ? "ATIVA" : "PAUSADA"}</span></div>
        <div className="automation-detail"><span className="automation-icon">◉</span><div><strong>Instagram {integration?.username ? `@${integration.username}` : "não conectado"}</strong><p>{currentSettings.sync_paused ? "Sincronização pausada nas configurações." : integration?.status === "connected" ? "Importação automática habilitada." : "Conecte uma conta profissional para importar publicações."}</p></div></div>
        <div className="automation-detail"><span className="automation-icon">✳</span><div><strong>Redação inteligente</strong><p>{currentSettings.writing_mode === "off" ? "Desativada — usa apenas a legenda original." : `Modo ${currentSettings.writing_mode}; pesquisa e expansão pela IA.`}</p></div></div>
        <div className="automation-footer"><span>Última sincronização <strong>{integration?.last_synced_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(integration.last_synced_at)) : "Nunca"}</strong></span><Link href="/admin/configuracoes">Ajustar automação ↗</Link></div>
        {integration?.last_error && <p className="form-error">{integration.last_error}</p>}
      </section>
      <section className="admin-panel run-panel"><div className="panel-title-row"><div><span className="eyebrow">ATIVIDADE AUTOMÁTICA</span><h2>Última execução</h2></div><span className={`run-dot ${latestRun?.status === "success" ? "run-ok" : latestRun?.status === "failed" ? "run-failed" : ""}`}/></div>{latestRun ? <><p className="run-message">{latestRun.message || "Automação executada."}</p><div className="run-summary"><span>{latestRun.imported_count} importadas</span><span>{latestRun.published_count} publicadas</span></div><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(latestRun.started_at))}</small></> : <div className="empty-run"><p>Nenhuma execução registrada ainda.</p><Link href="/admin/configuracoes">Conecte o Instagram para começar ↗</Link></div>}</section></div>
    <section className="admin-panel recent-panel"><div className="panel-title-row"><div><span className="eyebrow">REDAÇÃO</span><h2>Notícias recentes</h2></div><Link href="/admin/noticias" className="text-link">Todas as matérias ↗</Link></div>{recentArticles?.length ? <div className="recent-list">{recentArticles.map((article) => <Link href={`/admin/noticias/${article.id}`} key={article.id} className="recent-row"><span className="recent-category">{article.category}</span><strong>{article.title}</strong><span className={`article-status status-${article.status}`}>{article.status}</span><time>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(article.created_at))}</time></Link>)}</div> : <p className="inline-note">As publicações importadas e matérias criadas serão listadas aqui.</p>}</section>
    <p className="admin-small-note">Estatísticas de acesso não configuradas. Para exibi-las, conecte um provedor de analytics compatível com a política de privacidade.</p>
  </AdminShell>;
}
