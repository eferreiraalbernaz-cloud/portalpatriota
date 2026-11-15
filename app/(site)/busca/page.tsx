import type { Metadata } from "next";
import { getPublicCreative } from "@/lib/ads/config";
import { NewsGrid } from "@/components/news-grid";
import { EmptyState } from "@/components/news-card";
import { getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = { title: "Pesquisar notícias" };
type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const [articles, creative] = await Promise.all([query ? getPublishedArticles({ search: query, limit: 60 }) : Promise.resolve([]), getPublicCreative()]);
  return <main className="category-page container">
    <div className="category-page-heading search-heading"><div><span className="eyebrow">PESQUISA</span><h1>{query ? `Resultados para “${query}”` : "Encontre uma notícia."}</h1><p>{query ? `${articles.length} resultado(s) encontrado(s).` : "Busque por título, assunto ou palavra-chave."}</p></div></div>
    {articles.length ? <NewsGrid articles={articles} creative={creative} placement="search" className="category-news-grid"/> : <EmptyState title={query ? "Nenhuma matéria encontrada." : "Digite algo para pesquisar."} detail={query ? "Tente outra palavra ou confira as editorias do portal." : "A pesquisa consulta as matérias publicadas no Portal Patriota BR."}/>}
  </main>;
}
