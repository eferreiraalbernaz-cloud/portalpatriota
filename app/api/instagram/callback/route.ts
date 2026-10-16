import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getMetaApiVersion } from "@/lib/config";
import { encryptMetaToken } from "@/lib/instagram/crypto";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getMetaAppCredentials } from "@/lib/integrations/provider-config";

type TokenResponse = { access_token?: string; user_id?: number | string; expires_in?: number; error_message?: string };

function settingsRedirect(request: NextRequest, message: string) {
  const url = new URL("/admin/configuracoes", request.url);
  url.searchParams.set("instagram", message);
  const response = NextResponse.redirect(url);
  response.cookies.set("ppbr_ig_oauth_state", "", { path: "/api/instagram/callback", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  const query = request.nextUrl.searchParams;
  if (query.get("error")) return settingsRedirect(request, "denied");
  const code = query.get("code");
  const returnedState = query.get("state");
  const savedState = request.cookies.get("ppbr_ig_oauth_state")?.value;
  if (!code || !returnedState || !savedState || returnedState !== savedState) return settingsRedirect(request, "state-error");

  const { appId: clientId, appSecret: clientSecret, redirectUri } = await getMetaAppCredentials();
  if (!clientId || !clientSecret || !redirectUri) return settingsRedirect(request, "not-configured");
  try {
    const shortForm = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: shortForm,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!shortResponse.ok) throw new Error("A autorização inicial da Meta falhou.");
    const shortToken = await shortResponse.json() as TokenResponse;
    if (!shortToken.access_token) throw new Error("A Meta não retornou um token de acesso.");

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", clientSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!longResponse.ok) throw new Error("A troca por token de longa duração falhou.");
    const longToken = await longResponse.json() as TokenResponse;
    if (!longToken.access_token) throw new Error("A Meta não retornou o token de longa duração.");

    const version = getMetaApiVersion();
    const profileUrl = new URL(`https://graph.instagram.com/${version}/me`);
    profileUrl.searchParams.set("fields", "user_id,username,account_type");
    const profileResponse = await fetch(profileUrl, { headers: { Authorization: `Bearer ${longToken.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!profileResponse.ok) throw new Error("Não foi possível confirmar o perfil profissional do Instagram.");
    const profile = await profileResponse.json() as { user_id?: string; id?: string; username?: string };
    const userId = String(profile.user_id || profile.id || shortToken.user_id || "");
    if (!userId || !profile.username) throw new Error("A resposta da Meta não incluiu o identificador e o usuário do perfil.");

    const encrypted = encryptMetaToken(longToken.access_token);
    const adminClient = createServiceSupabaseClient();
    const expiresAt = new Date(Date.now() + Number(longToken.expires_in || 5_184_000) * 1000).toISOString();
    const { error } = await adminClient.from("instagram_integrations").upsert({
      id: 1,
      ig_user_id: userId,
      username: profile.username,
      token_ciphertext: encrypted.ciphertext,
      token_iv: encrypted.iv,
      token_auth_tag: encrypted.authTag,
      token_expires_at: expiresAt,
      last_refresh_attempt_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      last_error: null,
      status: "connected",
    }, { onConflict: "id" });
    if (error) throw new Error("O vínculo foi autorizado, mas não pôde ser salvo no banco.");
    return settingsRedirect(request, "connected");
  } catch (error) {
    console.error("Falha no retorno OAuth do Instagram.", { message: error instanceof Error ? error.message : "erro desconhecido" });
    return settingsRedirect(request, "connection-error");
  }
}
