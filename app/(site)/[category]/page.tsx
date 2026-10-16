import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, NewsCard } from "@/components/news-card";
import { categoryBySlug } from "@/lib/categories";
import { getPublishedArticles } from "@/lib/articles";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return { title: "Página não encontrada" };
  return { title: `${category.label} — Notícias`, description: `Acompanhe as notícias de ${category.label} no Portal Patriota BR.` };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();
  const articles = await getPublishedArticles({ category: category.name, limit: 60 });
  return <main className="category-page container">
    <div className="breadcrumb"><Link href="/">Início</Link><span>/</span><span>{category.name}</span></div>
    <div className="category-page-heading"><div><span className="eyebrow">EDITORIA</span><h1>{category.label}<span>.</span></h1><p>As notícias de {category.label.toLocaleLowerCase("pt-BR")} publicadas pelo Portal Patriota BR.</p></div><span className="category-page-number">{String(articles.length).padStart(2, "0")} <small>MATÉRIAS</small></span></div>
    {articles.length ? <div className="news-grid category-news-grid">{articles.map((article, index) => <div key={article.id} className={index === 0 ? "category-first-story" : ""}><NewsCard article={article} featured={index === 0}/></div>)}</div> : <EmptyState title={`Ainda não há notícias em ${category.label}.`} detail="As matérias desta editoria aparecerão aqui assim que forem publicadas."/>}
  </main>;
}
