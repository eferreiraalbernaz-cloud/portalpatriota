import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCreative } from "@/lib/ads/config";
import { NewsGrid } from "@/components/news-grid";
import { EmptyState } from "@/components/news-card";
import { categoryBySlug } from "@/lib/categories";
import { getPublishedArticles } from "@/lib/articles";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return { title: "Página não encontrada" };
  return { alternates: { canonical: `/${category.slug}` }, title: `${category.label} — Notícias`, description: `Acompanhe as notícias de ${category.label} no Portal Patriota BR.` };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();
  const [articles, creative] = await Promise.all([getPublishedArticles({ category: category.name, limit: 60 }), getPublicCreative()]);
  return <main className="category-page container">
    <div className="breadcrumb"><Link href="/">Início</Link><span>/</span><span>{category.name}</span></div>
    <div className="category-page-heading"><div><span className="eyebrow">EDITORIA</span><h1>{category.label}<span>.</span></h1><p>As notícias de {category.label.toLocaleLowerCase("pt-BR")} publicadas pelo Portal Patriota BR.</p></div><span className="category-page-number">{String(articles.length).padStart(2, "0")} <small>MATÉRIAS</small></span></div>
    {articles.length ? <NewsGrid articles={articles} creative={creative} featureFirst placement="category" className="category-news-grid"/> : <EmptyState title={`Ainda não há notícias em ${category.label}.`} detail="As matérias desta editoria aparecerão aqui assim que forem publicadas."/>}
  </main>;
}
