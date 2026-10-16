import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isAdminBackendConfigured } from "@/lib/config";

function secretMatches(expected: string, supplied: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.BOOTSTRAP_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expectedSecret || expectedSecret.length < 32) return NextResponse.json({ error: "BOOTSTRAP_SECRET precisa ter ao menos 32 caracteres aleatórios." }, { status: 503 });
  if (!suppliedSecret || !secretMatches(expectedSecret, suppliedSecret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email || !z.string().email().safeParse(email).success) return NextResponse.json({ error: "BOOTSTRAP_ADMIN_EMAIL não está configurado corretamente." }, { status: 503 });
  if (!isAdminBackendConfigured()) return NextResponse.json({ error: "Configure Supabase e a chave privada do servidor." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { email?: string };
  if (body.email && body.email.toLowerCase() !== email.toLowerCase()) return NextResponse.json({ error: "O e-mail solicitado não corresponde ao administrador configurado." }, { status: 400 });

  const admin = createServiceSupabaseClient();
  const { count, error: countError } = await admin.from("admin_users").select("user_id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "Não foi possível verificar a configuração inicial do banco." }, { status: 503 });
  if ((count || 0) > 0) return NextResponse.json({ error: "O primeiro administrador já foi criado. Remova BOOTSTRAP_SECRET do ambiente." }, { status: 409 });

  const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Não foi possível verificar se a conta administrativa já existe." }, { status: 503 });
  const user = existing.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  const invite = user
    ? { data: { user }, error: null }
    : await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/auth/callback?next=/admin/definir-senha` });
  if (invite.error || !invite.data.user) {
    console.error("Não foi possível convidar o administrador inicial.", { status: invite.error?.status });
    return NextResponse.json({ error: "Não foi possível criar o convite administrativo. Verifique o provedor de e-mail do Supabase." }, { status: 502 });
  }
  const { error: insertError } = await admin.from("admin_users").insert({ user_id: invite.data.user.id });
  if (insertError) {
    console.error("Não foi possível registrar o administrador inicial.", { code: insertError.code });
    return NextResponse.json({ error: "O usuário foi criado, mas a autorização administrativa falhou. Consulte os logs do servidor." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: `${user ? "Conta existente autorizada" : "Convite enviado"} para ${email}. ${user ? "Use Esqueceu a senha? na tela de login se necessário." : "Defina sua senha pelo link recebido."} Remova BOOTSTRAP_SECRET após concluir a configuração.` });
}
