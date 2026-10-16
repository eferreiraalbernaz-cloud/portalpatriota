import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    await supabase.auth.signOut();
  }
  return response;
}
