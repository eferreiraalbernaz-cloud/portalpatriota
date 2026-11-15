import type { Metadata } from "next";
import { getPublicCreative } from "@/lib/ads/config";
import { HomeContent } from "@/components/home-content";
import { getPortalSettings, getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Notícias do Brasil",
  alternates: { canonical: "/" },
  verification: { google: "bFwQULsdhPQy8MUKnGU8BF2VcNeyDTbJq3TOxEUEYy8" },
  // Ownership verification only; keep this tag after Monetag confirms the site.
  other: { monetag: "0a8b1afea39b9209785af1ec15d7b8b9" },
  description: "Acompanhe as principais notícias de Política, Brasil, Segurança, Esportes, Saúde, Ribeira do Pombal e Bahia.",
};

export default async function HomePage() {
  const [articles, settings, creative] = await Promise.all([getPublishedArticles({ limit: 40 }), getPortalSettings(), getPublicCreative()]);
  return <HomeContent articles={articles} settings={settings} creative={creative}/>;
}
