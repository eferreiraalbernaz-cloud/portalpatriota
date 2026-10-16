import "server-only";

import { DEFAULT_SETTINGS, type Article, type PortalSettings } from "@/lib/types";
import { createPublicSupabaseClient } from "@/lib/supabase/server";

const ARTICLE_FIELDS = "id,slug,category,category_slug,title,subtitle,body,image_url,status,highlighted,sources,instagram_url,original_caption,published_at,created_at,updated_at";

export async function getPortalSettings(): Promise<PortalSettings> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data } = await supabase.from("portal_settings").select("site_name,logo_url,instagram_url,facebook_url,youtube_url,albr_contact_url,institutional_text").eq("id", 1).maybeSingle();
  return data ? { ...DEFAULT_SETTINGS, ...data } as PortalSettings : DEFAULT_SETTINGS;
}

export async function getPublishedArticles(options?: { category?: string; limit?: number; search?: string; highlighted?: boolean }) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [] as Article[];
  let query = supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(options?.limit ?? 60);
  if (options?.category) query = query.eq("category", options.category);
  if (options?.highlighted) query = query.eq("highlighted", true);
  if (options?.search) {
    const term = options.search.replace(/[,%()]/g, " ").trim().slice(0, 100);
    if (term) query = query.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,body.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Falha ao buscar matérias publicadas.", { code: error.code });
    return [] as Article[];
  }
  return (data || []) as unknown as Article[];
}

export async function getPublishedArticle(category: string, slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("articles").select(ARTICLE_FIELDS).eq("status", "published").eq("category_slug", category).eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return data as unknown as Article;
}

export async function getPublishedArticleBySlug(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("articles").select(ARTICLE_FIELDS).eq("status", "published").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return data as unknown as Article;
}
