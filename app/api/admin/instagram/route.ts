import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("instagram_integrations").delete().eq("id", 1);
  if (error) return NextResponse.json({ error: "Não foi possível remover a conexão do Instagram." }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Token removido. As matérias já importadas continuam no portal." });
}
