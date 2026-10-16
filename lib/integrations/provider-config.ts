import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { decryptMetaToken, encryptMetaToken } from "@/lib/instagram/crypto";
import { getSiteUrl } from "@/lib/config";

type ProviderRow = {
  id: number;
  meta_app_id: string | null;
  meta_app_secret_ciphertext: string | null;
  meta_app_secret_iv: string | null;
  meta_app_secret_tag: string | null;
  openai_api_key_ciphertext: string | null;
  openai_api_key_iv: string | null;
  openai_api_key_tag: string | null;
  openai_model: string | null;
  legacyMetaSecret?: string | null;
  legacyOpenAiKey?: string | null;
};

const EMPTY: ProviderRow = {
  id: 1,
  meta_app_id: null,
  meta_app_secret_ciphertext: null,
  meta_app_secret_iv: null,
  meta_app_secret_tag: null,
  openai_api_key_ciphertext: null,
  openai_api_key_iv: null,
  openai_api_key_tag: null,
  openai_model: "gpt-5-mini",
};

export function isEncryptionKeyConfigured() {
  const encoded = process.env.APP_SECRETS_ENCRYPTION_KEY || process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!encoded) return false;
  try { return Buffer.from(encoded, "base64").length === 32; } catch { return false; }
}

export function getMetaRedirectUri() {
  return `${getSiteUrl()}/api/instagram/callback`;
}

export async function readProviderRow() {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.from("provider_config").select("*").eq("id", 1).maybeSingle();
  if (error) {
    // Keep existing environment-based deployments working until the new migration is applied.
    return {
      ...EMPTY,
      meta_app_id: process.env.META_APP_ID || null,
      openai_model: process.env.OPENAI_MODEL || EMPTY.openai_model,
      legacyMetaSecret: process.env.META_APP_SECRET || null,
      legacyOpenAiKey: process.env.OPENAI_API_KEY || null,
    };
  }
  const row = { ...EMPTY, ...(data as Partial<ProviderRow> | null) };
  return {
    ...row,
    meta_app_id: row.meta_app_id || process.env.META_APP_ID || null,
    openai_model: row.openai_model || process.env.OPENAI_MODEL || EMPTY.openai_model,
    legacyMetaSecret: row.meta_app_secret_ciphertext ? null : process.env.META_APP_SECRET || null,
    legacyOpenAiKey: row.openai_api_key_ciphertext ? null : process.env.OPENAI_API_KEY || null,
  };
}

function decryptColumns(ciphertext: string | null, iv: string | null, authTag: string | null) {
  if (!ciphertext || !iv || !authTag) return null;
  return decryptMetaToken({ token_ciphertext: ciphertext, token_iv: iv, token_auth_tag: authTag });
}

export async function getMetaAppCredentials() {
  const row = await readProviderRow();
  const secret = decryptColumns(row.meta_app_secret_ciphertext, row.meta_app_secret_iv, row.meta_app_secret_tag) || row.legacyMetaSecret;
  return { appId: row.meta_app_id || "", appSecret: secret || "", redirectUri: getMetaRedirectUri() };
}

export async function getOpenAiCredentials() {
  const row = await readProviderRow();
  const apiKey = decryptColumns(row.openai_api_key_ciphertext, row.openai_api_key_iv, row.openai_api_key_tag) || row.legacyOpenAiKey;
  return { apiKey: apiKey || "", model: row.openai_model || "gpt-5-mini" };
}

export function providerConfigStatus(row: Awaited<ReturnType<typeof readProviderRow>>) {
  const metaSecretSaved = Boolean((row.meta_app_secret_ciphertext && row.meta_app_secret_iv && row.meta_app_secret_tag) || row.legacyMetaSecret);
  const openAiKeySaved = Boolean((row.openai_api_key_ciphertext && row.openai_api_key_iv && row.openai_api_key_tag) || row.legacyOpenAiKey);
  return {
    metaAppId: row.meta_app_id || "",
    metaConfigured: Boolean(row.meta_app_id && metaSecretSaved),
    openAiConfigured: openAiKeySaved,
    openAiModel: row.openai_model || "gpt-5-mini",
    redirectUri: getMetaRedirectUri(),
    encryptionReady: isEncryptionKeyConfigured(),
  };
}

export type ProviderConfigStatus = ReturnType<typeof providerConfigStatus>;

export function sealProviderSecret(secret: string) {
  return encryptMetaToken(secret);
}
