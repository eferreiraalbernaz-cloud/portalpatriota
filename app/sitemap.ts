import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { getPublishedArticles } from "@/lib/articles";
import { getSiteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const articles = await getPublishedArticles({ limit: 1000 });
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    ...CATEGORIES.map((category) => ({ url: `${base}/${category.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...articles.map((article) => ({ url: `${base}/${CATEGORIES.find((category) => category.name === article.category)?.slug || "brasil"}/${article.slug}`, lastModified: article.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
