"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="login-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      router.replace("/admin"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }}>
    <label>Senha<input name="password" type="password" autoComplete="current-password" required minLength={6} maxLength={200} placeholder="Sua senha segura"/></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary login-submit" disabled={busy}>{busy ? "Entrando…" : "Entrar no painel"}<span>↗</span></button>
    <p className="forgot-password">Acesso exclusivo à administração do portal.</p>
  </form>;
}
