export const DEFAULT_DIRECT_LINK = "https://uplcm.com/4/12272346";
export const AD_PREFERENCES_EVENT = "portal:advertising-preferences";

export type DirectLinkCreative = {
  enabled: boolean;
  image_url: string;
  title: string;
  description: string;
  target_url: string;
  review_confirmed: boolean;
};

export const EMPTY_CREATIVE: DirectLinkCreative = {
  enabled: false, image_url: "", title: "", description: "",
  target_url: DEFAULT_DIRECT_LINK, review_confirmed: false,
};

export function isDirectLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "uplcm.com" && !url.port &&
      !url.username && !url.password && !url.hash && /^\/4\/[1-9][0-9]*$/.test(url.pathname);
  } catch { return false; }
}

export function isCreativeImage(value: string, mediaOrigin: string) {
  if (/^\/ads\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp|avif)$/i.test(value) && !value.includes("..")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === new URL(mediaOrigin).origin &&
      !url.username && !url.password && !url.search && !url.hash &&
      /^\/storage\/v1\/object\/public\/portal-media\/.+\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname);
  } catch { return false; }
}

export function creativeIssues(creative: DirectLinkCreative, mediaOrigin: string) {
  const issues: string[] = [];
  if (!isCreativeImage(creative.image_url, mediaOrigin)) issues.push("Envie uma imagem ao portal ou use uma imagem válida da pasta /ads/.");
  if (creative.title.trim().length < 3 || creative.title.length > 100) issues.push("Informe um título de 3 a 100 caracteres.");
  if (creative.description.trim().length < 10 || creative.description.length > 240) issues.push("Informe uma descrição de 10 a 240 caracteres.");
  if (!isDirectLink(creative.target_url)) issues.push("Informe um Direct Link HTTPS válido de uplcm.com/4/.");
  if (!creative.review_confirmed) issues.push("Confirme a autorização do criativo e sua compatibilidade com as ofertas do Direct Link.");
  return issues;
}

export type FeedEntry<T> = { kind: "news"; item: T; index: number } | { kind: "ad"; key: string };
export function buildAdvertisingFeed<T>(items: T[], hasCreative: boolean): FeedEntry<T>[] {
  const feed: FeedEntry<T>[] = [];
  items.forEach((item, index) => {
    feed.push({ kind: "news", item, index });
    if (hasCreative && (index + 1) % 4 === 0) feed.push({ kind: "ad", key: `after-${index + 1}` });
  });
  if (hasCreative && items.length > 0 && items.length < 4) feed.push({ kind: "ad", key: "small-grid" });
  return feed;
}
