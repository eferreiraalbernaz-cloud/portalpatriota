import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryBySlug, CATEGORIES } from "@/lib/categories";
import { getPublishedArticle, getPublishedArticles } from "@/lib/articles";
import { getSiteUrl } from "@/lib/config";
import { formatDate, NewsCard } from "@/components/news-card";

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const article = await getPublishedArticle(category, slug);
  if (!article) return { title: "Matéria não encontrada" };
  const url = `${getSiteUrl()}/${category}/${slug}`;
  return {
    title: article.title,
    description: article.subtitle || article.body.slice(0, 155),
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: article.title, description: article.subtitle || article.body.slice(0, 155), publishedTime: article.published_at || undefined, images: article.image_url ? [{ url: article.image_url }] : undefined },
    twitter: { card: "summary_large_image", title: article.title, description: article.subtitle || article.body.slice(0, 155), images: article.image_url ? [article.image_url] : undefined },
  };
}

function structuredData(article: { title: string; subtitle: string | null; body: string; image_url: string | null; published_at: string | null; updated_at: string; category: string; slug: string }) {
  const category = CATEGORIES.find(({ name }) => name === article.category);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.subtitle || article.body.slice(0, 155),
    image: article.image_url ? [article.image_url] : undefined,
    datePublished: article.published_at || undefined,
    dateModified: article.updated_at,
    articleSection: article.category,
    inLanguage: "pt-BR",
    mainEntityOfPage: `${getSiteUrl()}/${category?.slug || "brasil"}/${article.slug}`,
    author: { "@type": "Organization", name: "Portal Patriota BR" },
    publisher: { "@type": "Organization", name: "Portal Patriota BR", logo: { "@type": "ImageObject", url: `${getSiteUrl()}/brand/portal-patriota-br.png` } },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { category: categorySlug, slug } = await params;
  const currentCategory = categoryBySlug(categorySlug);
  if (!currentCategory) notFound();
  const article = await getPublishedArticle(categorySlug, slug);
  if (!article) notFound();
  const [related] = await Promise.all([getPublishedArticles({ category: article.category, limit: 4 })]);
  const articleJsonLd = structuredData(article);
  return <main className="article-page container">
    <div className="breadcrumb"><Link href="/">Início</Link><span>/</span><Link href={`/${currentCategory.slug}`}>{currentCategory.label}</Link><span>/</span><span>Matéria</span></div>
    <article className="article-main">
      <div className="article-heading"><span className="category-tag">{article.category}</span><h1>{article.title}</h1>{article.subtitle && <p className="article-subtitle">{article.subtitle}</p>}<div className="article-byline"><span>REDAÇÃO PORTAL PATRIOTA BR</span><span className="meta-dot"/><time dateTime={article.published_at || article.created_at}>{formatDate(article.published_at || article.created_at)}</time></div></div>
      {article.image_url && <figure className="article-cover"><Image src={article.image_url} alt="" width={1440} height={920} className="article-cover-image" unoptimized/><figcaption>Imagem da publicação original ou fornecida pela redação.</figcaption></figure>}
      <div className="article-layout"><div className="article-body">{article.body.split(/\n{2,}/).map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph.trim()}</p> : null)}
        {article.sources?.length > 0 && <section className="article-sources"><h2>Fontes consultadas</h2><ul>{article.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.publisher || source.url}<span>↗</span></a>{source.publisher && <small>{source.publisher}</small>}</li>)}</ul></section>}
        {article.instagram_url && <p className="instagram-original">Publicação original: <a href={article.instagram_url} target="_blank" rel="noopener noreferrer">ver no Instagram ↗</a></p>}
      </div><aside className="article-share"><span>COMPARTILHE</span><a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${getSiteUrl()}/${categorySlug}/${slug}`)}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no WhatsApp">WA</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${getSiteUrl()}/${categorySlug}/${slug}`)}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no Facebook">f</a></aside></div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}/>
    </article>
    {related.filter((item) => item.id !== article.id).length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">LEIA TAMBÉM</span><h2>Mais de {currentCategory.label}</h2></div><Link className="text-link" href={`/${currentCategory.slug}`}>Ver editoria <span>↗</span></Link></div><div className="news-grid">{related.filter((item) => item.id !== article.id).slice(0, 3).map((item) => <NewsCard key={item.id} article={item}/>)}</div></section>}
  </main>;
}
