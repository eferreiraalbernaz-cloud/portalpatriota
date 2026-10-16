import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { removeManagedMedia } from "@/lib/storage-media";

function optionalUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function safeImageUrl(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

const settingsSchema = z.object({
  site_name: z.string().trim().min(3).max(80),
  logo_url: z.string().trim().min(1).max(2048).refine(safeImageUrl),
  instagram_url: z.string().trim().max(2048).refine(optionalUrl),
  facebook_url: z.string().trim().max(2048).refine(optionalUrl),
  youtube_url: z.string().trim().max(2048).refine(optionalUrl),
  albr_contact_url: z.string().trim().max(2048).refine(optionalUrl),
  institutional_text: z.string().trim().max(500),
  writing_mode: z.enum(["short", "medium", "long", "off"]),
  auto_publish: z.boolean(),
  sync_paused: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os endereços e as configurações informadas." }, { status: 400 });
  const supabase = createServiceSupabaseClient();
  const { data: previous } = await supabase.from("portal_settings").select("logo_url").eq("id", 1).maybeSingle();
  const { error } = await supabase.from("portal_settings").upsert({ id: 1, ...parsed.data }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "Não foi possível salvar as configurações." }, { status: 500 });
  if (previous?.logo_url && previous.logo_url !== parsed.data.logo_url) await removeManagedMedia(previous.logo_url);
  return NextResponse.json({ ok: true });
}
