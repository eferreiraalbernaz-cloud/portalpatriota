import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { getSupabaseUrl, isAdminBackendConfigured } from "@/lib/config";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { creativeIssues, isCreativeImage, isDirectLink } from "@/lib/ads/direct-link";

const schema = z.object({
  enabled: z.boolean(), image_url: z.string().trim().max(2048), title: z.string().trim().max(100),
  description: z.string().trim().max(240), target_url: z.string().trim().max(2048), review_confirmed: z.boolean(),
}).strict();

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os campos do criativo." }, { status: 400 });
  const creative = parsed.data;
  const mediaOrigin = getSupabaseUrl() || "";
  if (creative.image_url && !isCreativeImage(creative.image_url, mediaOrigin)) return NextResponse.json({ error: "Use uma imagem enviada ao portal ou da pasta /ads/." }, { status: 400 });
  if (!isDirectLink(creative.target_url)) return NextResponse.json({ error: "Use um Direct Link HTTPS de uplcm.com/4/." }, { status: 400 });
  const issues = creativeIssues(creative, mediaOrigin);
  if (creative.enabled && issues.length) return NextResponse.json({ error: issues.join(" ") }, { status: 400 });
  if (!isAdminBackendConfigured()) return NextResponse.json({ error: "Backend administrativo não configurado." }, { status: 503 });
  try {
    const { error } = await createServiceSupabaseClient().from("advertising_creative").upsert({ id: 1, ...creative }, { onConflict: "id" });
    if (error) return NextResponse.json({ error: "Não foi possível salvar. Confira a migração direct_link_cards e o acesso ao Supabase." }, { status: 503 });
    return NextResponse.json({ ok: true, creative }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível acessar o Supabase. Tente novamente." }, { status: 503 }); }
}
