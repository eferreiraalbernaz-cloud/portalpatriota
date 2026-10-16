import Image from "next/image";
import Link from "next/link";
import { categoryByName } from "@/lib/categories";
import type { Article } from "@/lib/types";

export function formatDate(value: string | null) {
  if (!value) return "Agora há pouco";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value)).replace(" de ", " ");
}

export function NewsCard({ article, featured = false, compact = false }: { article: Article; featured?: boolean; compact?: boolean }) {
  const category = categoryByName(article.category);
  return <article className={`news-card${featured ? " news-card-featured" : ""}${compact ? " news-card-compact" : ""}`}>
    <Link href={`/${category?.slug || "brasil"}/${article.slug}`} className="news-card-link">
      <div className="news-image-wrap">
        {article.image_url ? <Image src={article.image_url} alt="" fill sizes={featured ? "(max-width: 760px) 100vw, 58vw" : "(max-width: 760px) 100vw, 32vw"} className="news-image" unoptimized /> : <div className="image-placeholder"><span>PPBR</span></div>}
        {featured && <span className="image-corner">EM DESTAQUE</span>}
      </div>
      <div className="news-card-copy">
        <div className="card-meta"><span className="category-tag">{article.category}</span><span className="meta-dot"/><time dateTime={article.published_at || article.created_at}>{formatDate(article.published_at || article.created_at)}</time></div>
        <h3>{article.title}</h3>
        {!compact && article.subtitle && <p>{article.subtitle}</p>}
        <span className="read-more">Leia a matéria <span aria-hidden="true">↗</span></span>
      </div>
    </Link>
  </article>;
}

export function EmptyState({ title = "Estamos preparando as próximas notícias.", detail = "Novas matérias aparecem aqui assim que forem publicadas." }: { title?: string; detail?: string }) {
  return <div className="empty-state"><span className="empty-mark">PP</span><h3>{title}</h3><p>{detail}</p></div>;
}
