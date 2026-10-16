import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl, getSupabasePublicKey, getSupabaseUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  const url = getSupabaseUrl(); const key = getSupabasePublicKey();
  if (!url || !key) return NextResponse.json({ error: "O serviço de autenticação não está configurado." }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getSiteUrl()}/auth/callback?next=/admin/definir-senha` });
  if (error) console.error("Solicitação de redefinição de senha falhou.", { status: error.status });
  // Resposta igual para contas existentes ou não, para não revelar e-mails cadastrados.
  return NextResponse.json({ ok: true, message: "Se a conta estiver cadastrada, enviaremos um link para redefinir a senha." });
}
