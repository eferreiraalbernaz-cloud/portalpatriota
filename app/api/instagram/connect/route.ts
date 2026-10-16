import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { newOAuthState } from "@/lib/instagram/pipeline";
import { getMetaAppCredentials } from "@/lib/integrations/provider-config";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { appId, appSecret, redirectUri } = await getMetaAppCredentials();
  const callback = redirectUri;
  if (!appId || !appSecret || !callback) return NextResponse.redirect(new URL("/admin/configuracoes?instagram=not-configured", request.url));
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(callback);
    if (callbackUrl.origin !== new URL(redirectUri).origin) throw new Error("Callback fora do domínio configurado.");
  } catch {
    return NextResponse.redirect(new URL("/admin/configuracoes?instagram=invalid-callback", request.url));
  }

  const state = newOAuthState();
  const authorization = new URL("https://www.instagram.com/oauth/authorize");
  authorization.searchParams.set("client_id", appId);
  authorization.searchParams.set("redirect_uri", callbackUrl.toString());
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "instagram_business_basic");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("enable_fb_login", "0");
  authorization.searchParams.set("force_authentication", "1");

  const response = NextResponse.redirect(authorization);
  response.cookies.set("ppbr_ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/instagram/callback",
    maxAge: 600,
  });
  return response;
}
