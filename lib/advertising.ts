export const MONETAG_ZONE = "12271754";
export const MONETAG_SCRIPT_URL = "https://nap5k.com/tag.min.js";
export const MONETAG_SCRIPT_ID = "portal-monetag-ipp";
export const AD_CONSENT_KEY = "portal-advertising-consent-v1";
export const AD_CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;

export type AdConsent = { version: 1; accepted: boolean; expires: number };

export function parseAdConsent(raw: string | null, now = Date.now()): AdConsent | null {
  try {
    const value = JSON.parse(raw || "null");
    return value?.version === 1 && typeof value.accepted === "boolean" &&
      typeof value.expires === "number" && Number.isFinite(value.expires) && value.expires > now
      ? value as AdConsent : null;
  } catch { return null; }
}

export function canLoadAdvertising(currentUrl: string, siteOrigin: string) {
  try {
    const current = new URL(currentUrl);
    const expected = new URL(siteOrigin);
    const privatePaths = ["/admin", "/api", "/auth", "/login", "/recuperar-senha", "/definir-senha"];
    return current.origin === expected.origin &&
      !privatePaths.some((path) => current.pathname === path || current.pathname.startsWith(`${path}/`));
  } catch { return false; }
}

declare global {
  interface Window { __portalMonetagStarted?: boolean; }
}
