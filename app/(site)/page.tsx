import type { Metadata } from "next";
import { HomeContent } from "@/components/home-content";
import { getPortalSettings, getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = { title: "Notícias do Brasil", alternates: { canonical: "/" }, verification: { google: "bFwQULsdhPQy8MUKnGU8BF2VcNeyDTbJq3TOxEUEYy8" }, description: "Acompanhe as principais notícias de Política, Brasil, Segurança, Esportes e Saúde." };

export default async function HomePage() {
  const [articles, settings] = await Promise.all([getPublishedArticles({ limit: 40 }), getPortalSettings()]);
  return <HomeContent articles={articles} settings={settings}/>;
}
