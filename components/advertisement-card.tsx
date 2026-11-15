"use client";

import { useEffect, useState } from "react";
import { AD_CONSENT_KEY, parseAdConsent } from "@/lib/advertising";
import { AD_PREFERENCES_EVENT, type DirectLinkCreative } from "@/lib/ads/direct-link";
import "./advertisement-card.css";

export function AdvertisementCard({ creative, preview = false }: { creative: DirectLinkCreative; preview?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(preview);
  useEffect(() => {
    if (preview) return;
    function sync() {
      try { setVisible(parseAdConsent(localStorage.getItem(AD_CONSENT_KEY))?.accepted !== false); }
      catch { setVisible(true); } // A static link does not contact Monetag before a click.
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AD_PREFERENCES_EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(AD_PREFERENCES_EVENT, sync); };
  }, [preview]);
  useEffect(() => setFailed(false), [creative.image_url]);
  if (!visible || failed || !creative.image_url || !creative.title.trim() || !creative.description.trim()) return null;
  return <aside className="advertisement-card" aria-label="Publicidade" data-ad-card>
    <span className="advertisement-label">PUBLICIDADE</span>
    <a href={preview ? undefined : creative.target_url} target={preview ? undefined : "_blank"}
      rel="sponsored noopener noreferrer" referrerPolicy="no-referrer" aria-label={`Publicidade: ${creative.title}${preview ? "" : " (abre em nova aba)"}`}>
      {/* A local/portal-hosted creative only; no vendor script, pixel or prefetch. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={creative.image_url} alt="" width={600} height={400} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      <div className="advertisement-copy"><h3>{creative.title}</h3><p>{creative.description}</p><span>Ver publicidade <span aria-hidden="true">↗</span></span></div>
    </a>
  </aside>;
}
