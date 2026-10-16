import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/password-form";
import { getAdminSession } from "@/lib/admin-auth";

export default async function SetPasswordPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login?auth=link-error");
  return <main className="login-page"><div className="login-panel"><Link href="/admin/login" className="login-back">← Voltar</Link><div className="login-brand"><Image src="/brand/portal-patriota-br.png" width={96} height={76} alt="Logomarca Portal Patriota BR"/><span>SEGURANÇA DA CONTA</span></div><div className="login-heading"><span className="eyebrow">PRIMEIRO ACESSO</span><h1>Defina sua<br/>senha.</h1><p>Escolha uma senha longa e exclusiva para proteger o painel administrativo.</p></div><PasswordForm/><div className="login-footer"><span>{admin.email}</span><span>PORTAL PATRIOTA BR</span></div></div><div className="login-art"><div className="login-art-lines"/><div className="login-art-copy"><span>ACESSO<br/>SEGURO.</span><i/><small>PORTAL PATRIOTA BR · BRASIL</small></div><span className="login-art-number">PPBR / 02</span></div></main>;
}
