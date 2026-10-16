import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const { id } = await context.params;
  const supabase = createServiceSupabaseClient();
  const { data: article } = await supabase.from("articles").select("id,title,body").eq("id", id).maybeSingle();
  if (!article) return NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 });
  if (article.title.trim().length < 5 || article.body.trim().length < 40) return NextResponse.json({ error: "A matéria precisa de título e texto antes de ser publicada." }, { status: 400 });
  const { error } = await supabase.from("articles").update({ status: "published", published_at: new Date().toISOString(), needs_review: false, review_reason: null, scheduled_at: null }).eq("id", id);
  if (error) return NextResponse.json({ error: "Não foi possível publicar a matéria." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
