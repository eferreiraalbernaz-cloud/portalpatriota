import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/config";

const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(200) });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Informe e-mail e senha válidos." }, { status: 400 });
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return NextResponse.json({ error: "O login ainda não está configurado." }, { status: 503 });

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  const { data: membership } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!membership) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Esta conta não tem acesso administrativo." }, { status: 403 });
  }
  return response;
}
