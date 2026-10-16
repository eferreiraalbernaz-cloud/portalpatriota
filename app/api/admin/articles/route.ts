import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORY_NAMES } from "@/lib/categories";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

function isSafeImageReference(value: string | null | undefined) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

const articleSchema = z.object({
  title: z.string().trim().min(5).max(180),
  subtitle: z.string().trim().max(280).optional().nullable(),
  body: z.string().max(50000).default(""),
  category: z.enum(CATEGORY_NAMES),
  image_url: z.string().trim().max(2048).optional().nullable().refine(isSafeImageReference),
  status: z.enum(["draft", "pending", "published", "scheduled", "archived"]).default("draft"),
  scheduled_at: z.string().datetime().optional().nullable(),
  highlighted: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const parsed = articleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira o título, a categoria e os campos da matéria." }, { status: 400 });
  const item = parsed.data;
  if (["published", "scheduled"].includes(item.status) && item.body.trim().length < 40) return NextResponse.json({ error: "Inclua o texto da matéria antes de publicar ou agendar." }, { status: 400 });
  if (item.status === "scheduled" && (!item.scheduled_at || Date.parse(item.scheduled_at) <= Date.now())) return NextResponse.json({ error: "Escolha uma data futura para o agendamento." }, { status: 400 });

  const supabase = createServiceSupabaseClient();
  const slug = slugify(item.title);
  const { data, error } = await supabase.from("articles").insert({
    slug,
    category: item.category,
    title: item.title,
    subtitle: item.subtitle || null,
    body: item.body,
    image_url: item.image_url || null,
    status: item.status,
    highlighted: item.highlighted,
    needs_review: false,
    review_reason: null,
    sources: [],
    ai_status: "skipped",
    author_id: admin.id,
    published_at: item.status === "published" ? new Date().toISOString() : null,
    scheduled_at: item.status === "scheduled" ? item.scheduled_at : null,
  }).select("id,slug").single();
  if (error) {
    return NextResponse.json({ error: error.code === "23505" ? "Já existe uma matéria com este endereço. Ajuste o título." : "Não foi possível salvar a matéria." }, { status: error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ article: data }, { status: 201 });
}
