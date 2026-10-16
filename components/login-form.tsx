"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="login-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      router.replace("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }}>
    <label>E-mail administrativo<input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="voce@seudominio.com.br"/></label>
    <label>Senha<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={200} placeholder="Sua senha segura"/></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary login-submit" disabled={busy}>{busy ? "Entrando…" : "Entrar no painel"}<span>↗</span></button>
    <Link className="forgot-password" href="/admin/recuperar-senha">Esqueceu a senha?</Link>
  </form>;
}
