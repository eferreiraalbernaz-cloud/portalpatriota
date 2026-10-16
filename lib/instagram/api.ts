import "server-only";

import { getMetaApiVersion } from "@/lib/config";

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
};

export async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.instagram.com/${getMetaApiVersion()}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number } };
    const error = new Error(payload.error?.message || `Instagram API retornou HTTP ${response.status}.`);
    Object.assign(error, { status: response.status, code: payload.error?.code });
    throw error;
  }
  return await response.json() as T;
}

export async function refreshInstagramToken(token: string) {
  const url = new URL(`https://graph.instagram.com/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Não foi possível renovar o token do Instagram (HTTP ${response.status}).`);
  return await response.json() as { access_token: string; expires_in: number; token_type: string };
}
