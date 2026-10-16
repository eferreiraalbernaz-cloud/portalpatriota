import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runScheduledAutomation } from "@/lib/instagram/pipeline";

export const maxDuration = 300;

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const result = await runScheduledAutomation();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Falha na execução da automação agendada.", { message: error instanceof Error ? error.message : "erro desconhecido" });
    return NextResponse.json({ error: "Falha na automação. Consulte os registros do servidor." }, { status: 500 });
  }
}
