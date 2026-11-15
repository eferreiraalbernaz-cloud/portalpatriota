import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { isAdminBackendConfigured } from "@/lib/config";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { MONETAG_ACTIVATION_BLOCK, monetizationSchema } from "@/lib/monetization";

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const parsed = monetizationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um Zone ID numérico positivo ou deixe o campo vazio." }, { status: 400 });
  if (parsed.data.enabled) return NextResponse.json({ error: MONETAG_ACTIVATION_BLOCK }, { status: 409 });
  if (!isAdminBackendConfigured()) return NextResponse.json({ error: "Backend administrativo não configurado." }, { status: 503 });
  try {
    const { error } = await createServiceSupabaseClient().from("monetization_config").upsert({
      id: 1, enabled: false, format: "in_page_push", zone_id: parsed.data.zoneId || null,
    }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: "Não foi possível salvar. Verifique a migração monetag_ipp_configuration e o acesso ao Supabase." }, { status: 503 });
    return NextResponse.json({ ok: true, enabled: false, zoneId: parsed.data.zoneId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível acessar o Supabase. Tente novamente." }, { status: 503 });
  }
}
