import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { syncInstagramPosts } from "@/lib/instagram/pipeline";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  try {
    const result = await syncInstagramPosts({ manual: true });
    return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200 });
  } catch (error) {
    console.error("Falha na sincronização manual do Instagram.", { message: error instanceof Error ? error.message : "erro desconhecido" });
    return NextResponse.json({ error: "A sincronização falhou. Consulte os registros de automação." }, { status: 500 });
  }
}
