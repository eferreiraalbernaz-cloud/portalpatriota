import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { reprocessArticle } from "@/lib/instagram/pipeline";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const { id } = await context.params;
  const result = await reprocessArticle(id).catch((error) => ({ error: error instanceof Error ? error.message : "Falha ao reprocessar." }));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result);
}
