"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <button className="admin-logout" disabled={busy} onClick={async () => { setBusy(true); await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); }}>{busy ? "Saindo…" : "Sair"}</button>;
}

export function SyncButton({ disabled = false }: { disabled?: boolean }) {
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="action-with-message"><button className="button button-primary" disabled={busy || disabled} onClick={async () => {
    setBusy(true); setState("");
    try {
      const response = await fetch("/api/admin/sync", { method: "POST" });
      const result = await response.json();
      setState(response.ok ? result.message || "Sincronização concluída." : result.error || result.message || "Falha ao sincronizar.");
    } catch { setState("Não foi possível concluir a sincronização."); }
    setBusy(false);
  }}>{busy ? "Sincronizando…" : "Sincronizar agora"}</button>{state && <span role="status">{state}</span>}</div>;
}

export function DisconnectInstagramButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <div className="action-with-message"><button className="button button-outline" disabled={busy} onClick={async () => {
    if (!window.confirm("Desconectar o Instagram? O token salvo será removido, mas as matérias já importadas serão mantidas.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/instagram", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível desconectar.");
      setMessage(result.message); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível desconectar."); }
    finally { setBusy(false); }
  }}>{busy ? "Desconectando…" : "Desconectar"}</button>{message && <span role="status">{message}</span>}</div>;
}
