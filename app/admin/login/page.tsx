import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getAdminSession } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/config";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <main className="login-page"><div className="login-panel"><a href="/" className="login-back">← Voltar ao portal</a><div className="login-brand"><Image src="/brand/portal-patriota-br.png" width={96} height={76} alt="Logomarca Portal Patriota BR"/><span>ÁREA ADMINISTRATIVA</span></div>
    <div className="login-heading"><span className="eyebrow">ACESSO RESTRITO</span><h1>Bem-vindo<br/>de volta.</h1><p>Entre para gerenciar as notícias e configurações do portal.</p></div>
    {isSupabaseConfigured() ? <LoginForm/> : <div className="setup-warning"><strong>Autenticação ainda não configurada</strong><p>Configure as variáveis do Supabase, aplique a migração e crie o primeiro administrador. Consulte o README para seguir o roteiro.</p></div>}
    <div className="login-footer"><span>PORTAL PATRIOTA BR</span><span>DESENVOLVIDO POR ALBR</span></div>
  </div><div className="login-art"><div className="login-art-lines"/><div className="login-art-copy"><span>INFORMAÇÃO<br/>QUE MOVE.</span><i/><small>PORTAL PATRIOTA BR · BRASIL</small></div><span className="login-art-number">PPBR / 01</span></div></main>;
}
