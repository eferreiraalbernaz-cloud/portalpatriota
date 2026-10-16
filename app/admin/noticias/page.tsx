import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAdminSession } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export default async function AdminNewsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const supabase = createServiceSupabaseClient();
  const { data: articles, error } = await supabase.from("articles").select("id,title,category,status,highlighted,needs_review,created_at,published_at,instagram_media_id").order("created_at", { ascending: false }).limit(100);
  return <AdminShell email={admin.email} title="Notícias" eyebrow="GERENCIAMENTO DE CONTEÚDO">
    <div className="admin-toolbar"><p>Revise, edite, agende e publique as matérias do portal.</p><Link href="/admin/noticias/nova" className="button button-primary">Nova matéria <span>＋</span></Link></div>
    <section className="admin-panel news-table-panel">{error ? <p className="form-error">Não foi possível carregar as matérias. Verifique a migração do banco.</p> : articles?.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>MATÉRIA</th><th>EDITORIA</th><th>STATUS</th><th>DATA</th><th></th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><Link href={`/admin/noticias/${article.id}`} className="table-title">{article.highlighted && <span className="highlight-star">✳</span>}{article.title}</Link>{article.needs_review && <small className="table-warning">Revisão necessária</small>}</td><td><span className="recent-category">{article.category}</span></td><td><span className={`article-status status-${article.status}`}>{article.status}</span></td><td>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(article.published_at || article.created_at))}</td><td><Link href={`/admin/noticias/${article.id}`} className="table-edit">Editar →</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty"><span>▤</span><h2>Nenhuma matéria ainda.</h2><p>Importe publicações do Instagram ou crie uma notícia manualmente.</p><Link href="/admin/noticias/nova" className="button button-primary">Criar primeira matéria</Link></div>}</section>
  </AdminShell>;
}
