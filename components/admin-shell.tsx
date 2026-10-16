import Link from "next/link";
import { LogoutButton } from "@/components/admin-actions";

export function AdminShell({ email, children, title, eyebrow = "PAINEL ADMINISTRATIVO" }: { email: string; children: React.ReactNode; title: string; eyebrow?: string }) {
  return <main className="admin-area">
    <header className="admin-header"><Link href="/admin" className="admin-brand"><span className="admin-brand-mark">PP</span><span><strong>PORTAL PATRIOTA BR</strong><small>ADMINISTRAÇÃO</small></span></Link><div className="admin-user"><span>{email}</span><LogoutButton/></div></header>
    <div className="admin-workspace">
      <aside className="admin-sidebar"><span className="admin-nav-label">GERENCIAR</span><Link href="/admin" className="admin-nav-link">◫ <span>Visão geral</span></Link><Link href="/admin/noticias" className="admin-nav-link">▤ <span>Notícias</span></Link><Link href="/admin/configuracoes" className="admin-nav-link">⚙ <span>Configurações</span></Link><span className="admin-nav-label admin-sidebar-bottom">PORTAL</span><Link href="/" className="admin-nav-link">↗ <span>Ver portal</span></Link></aside>
      <section className="admin-content"><div className="admin-page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><span className="admin-heading-date">PORTAL PATRIOTA BR <i/> ONLINE</span></div>{children}</section>
    </div>
  </main>;
}
