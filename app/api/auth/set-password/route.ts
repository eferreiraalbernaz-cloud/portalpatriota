import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({ password: z.string().min(12).max(200) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Abra primeiro o link enviado por e-mail." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use uma senha com pelo menos 12 caracteres." }, { status: 400 });
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a senha. Solicite um novo link." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
