"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function RecoverPasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="login-page"><div className="login-panel"><Link href="/admin/login" className="login-back">← Voltar ao login</Link><div className="login-brand"><Image src="/brand/portal-patriota-br.png" width={96} height={76} alt="Logomarca Portal Patriota BR"/><span>RECUPERAÇÃO DE CONTA</span></div><div className="login-heading"><span className="eyebrow">LINK DE ACESSO</span><h1>Redefina<br/>sua senha.</h1><p>Enviaremos um link seguro para o e-mail administrativo, se a conta estiver cadastrada.</p></div><form className="login-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setMessage(""); const email = String(new FormData(event.currentTarget).get("email") || ""); try { const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const result = await response.json(); setMessage(response.ok ? result.message : result.error); } catch { setMessage("Não foi possível solicitar o link agora."); } finally { setBusy(false); } }}><label>E-mail administrativo<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="voce@seudominio.com.br"/></label>{message && <p className="form-success" role="status">{message}</p>}<button className="button button-primary login-submit" disabled={busy}>{busy ? "Enviando…" : "Enviar link seguro"}</button></form></div><div className="login-art"><div className="login-art-lines"/><div className="login-art-copy"><span>RECUPERE<br/>O ACESSO.</span><i/><small>PORTAL PATRIOTA BR · BRASIL</small></div><span className="login-art-number">PPBR / 03</span></div></main>;
}
