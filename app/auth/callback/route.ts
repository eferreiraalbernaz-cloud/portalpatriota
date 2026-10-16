import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("next");
  const next = target === "/admin/definir-senha" ? target : "/admin";
  const response = NextResponse.redirect(new URL(next, request.url));
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!url || !key) return NextResponse.redirect(new URL("/admin/login?auth=not-configured", request.url));
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/admin/login?auth=link-error", request.url));
  } else if (tokenHash && (type === "invite" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return NextResponse.redirect(new URL("/admin/login?auth=link-error", request.url));
  } else {
    return NextResponse.redirect(new URL("/admin/login?auth=link-error", request.url));
  }
  return response;
}
