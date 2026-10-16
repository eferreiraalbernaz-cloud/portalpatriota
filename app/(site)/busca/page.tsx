import type { Metadata } from "next";
import { EmptyState, NewsCard } from "@/components/news-card";
import { getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = { title: "Pesquisar notícias" };
type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const articles = query ? await getPublishedArticles({ search: query, limit: 60 }) : [];
  return <main className="category-page container">
    <div className="category-page-heading search-heading"><div><span className="eyebrow">PESQUISA</span><h1>{query ? `Resultados para “${query}”` : "Encontre uma notícia."}</h1><p>{query ? `${articles.length} resultado(s) encontrado(s).` : "Busque por título, assunto ou palavra-chave."}</p></div></div>
    {articles.length ? <div className="news-grid category-news-grid">{articles.map((article) => <NewsCard key={article.id} article={article}/>)}</div> : <EmptyState title={query ? "Nenhuma matéria encontrada." : "Digite algo para pesquisar."} detail={query ? "Tente outra palavra ou confira as editorias do portal." : "A pesquisa consulta as matérias publicadas no Portal Patriota BR."}/>}
  </main>;
}
