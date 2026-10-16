import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !ALLOWED_TYPES[file.type] || file.size < 1 || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Envie JPG, PNG, WebP ou AVIF de até 8 MB." }, { status: 400 });
  }
  const supabase = createServiceSupabaseClient();
  const path = `editor/${randomUUID()}.${ALLOWED_TYPES[file.type]}`;
  const { error } = await supabase.storage.from("portal-media").upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return NextResponse.json({ error: "Não foi possível armazenar a imagem." }, { status: 500 });
  return NextResponse.json({ url: supabase.storage.from("portal-media").getPublicUrl(path).data.publicUrl });
}
