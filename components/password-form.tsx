"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="login-form" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) { setMessage("As senhas não coincidem."); setBusy(false); return; }
    try {
      const response = await fetch("/api/auth/set-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a senha.");
      setMessage("Senha atualizada. Redirecionando para o painel…");
      setTimeout(() => { router.replace("/admin"); router.refresh(); }, 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a senha."); }
    finally { setBusy(false); }
  }}>
    <label>Nova senha<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} placeholder="Mínimo de 12 caracteres"/></label>
    <label>Confirme a nova senha<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={200} placeholder="Digite novamente"/></label>
    {message && <p role="status" className={message.includes("não") || message.includes("Não") ? "form-error" : "form-success"}>{message}</p>}
    <button className="button button-primary login-submit" disabled={busy}>{busy ? "Salvando…" : "Definir senha"}</button>
  </form>;
}
