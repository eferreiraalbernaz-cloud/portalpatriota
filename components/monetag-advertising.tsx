"use client";

import Link from "next/link";
import "./monetag-advertising.css";
import { useEffect, useState } from "react";
import {
  AD_CONSENT_KEY, AD_CONSENT_LIFETIME, MONETAG_SCRIPT_ID, MONETAG_SCRIPT_URL,
  MONETAG_ZONE, canLoadAdvertising, parseAdConsent, type AdConsent,
} from "@/lib/advertising";

export function MonetagAdvertising({ siteOrigin }: { siteOrigin: string }) {
  const [consent, setConsent] = useState<AdConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    function sync() {
      let value: AdConsent | null = null;
      try { value = parseAdConsent(localStorage.getItem(AD_CONSENT_KEY)); } catch { /* Default to no advertising. */ }
      // Removing a script does not remove vendor timers/listeners. End the document instead.
      if (!value?.accepted && window.__portalMonetagStarted) {
        window.location.reload();
        return;
      }
      setConsent(value);
      setReady(true);
    }
    sync();
    const storage = (event: StorageEvent) => { if (event.key === AD_CONSENT_KEY || event.key === null) sync(); };
    const visibility = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    const expiryCheck = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
      window.clearInterval(expiryCheck);
    };
  }, []);

  useEffect(() => {
    if (!ready || !consent?.accepted || !canLoadAdvertising(window.location.href, siteOrigin)) return;
    let timer: number | undefined;
    function load() {
      if (window.__portalMonetagStarted || document.getElementById(MONETAG_SCRIPT_ID)) return;
      // Keep the supplied URL and data-zone on the actual vendor script element.
      const script = document.createElement("script");
      script.id = MONETAG_SCRIPT_ID;
      script.dataset.zone = MONETAG_ZONE;
      script.src = MONETAG_SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", () => { script.dataset.loadState = "loaded"; }, { once: true });
      script.addEventListener("error", () => {
        script.dataset.loadState = "error";
        setLoadFailed(true);
      }, { once: true });
      window.__portalMonetagStarted = true;
      document.head.appendChild(script);
    }
    const schedule = () => { timer = window.setTimeout(load, 1000); };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
    };
  }, [ready, consent?.accepted, siteOrigin]);

  function choose(accepted: boolean) {
    const value: AdConsent = { version: 1, accepted, expires: Date.now() + AD_CONSENT_LIFETIME };
    try { localStorage.setItem(AD_CONSENT_KEY, JSON.stringify(value)); } catch { /* Consent applies to this visit only. */ }
    if (!accepted && window.__portalMonetagStarted) {
      window.location.reload();
      return;
    }
    setConsent(value);
    setPreferencesOpen(false);
  }

  return <>
    <div className="advertising-preferences container">
      <button type="button" onClick={() => setPreferencesOpen(true)} aria-expanded={preferencesOpen}>Preferências de publicidade</button>
    </div>
    {ready && (!consent || preferencesOpen) && <section className="advertising-consent" aria-label="Preferências de publicidade">
      <div><strong>Publicidade com sua escolha</strong><p>Com sua autorização, exibimos anúncios Monetag In-Page Push. O serviço pode usar cookies, identificadores e dados de navegação para selecionar anúncios e medir resultados. Você pode recusar e continuar lendo normalmente ou mudar sua escolha no rodapé. <Link href="/privacidade">Saiba mais sobre privacidade</Link>.</p>
        {loadFailed && <p role="status">A publicidade está indisponível neste navegador. Você pode continuar lendo normalmente.</p>}
      </div>
      <div className="advertising-consent-actions">
        <button type="button" className="button button-outline" onClick={() => choose(false)}>Continuar sem anúncios</button>
        <button type="button" className="button button-outline" onClick={() => choose(true)}>Aceitar publicidade</button>
      </div>
    </section>}
  </>;
}
