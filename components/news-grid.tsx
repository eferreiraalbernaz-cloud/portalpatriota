import { NewsCard } from "@/components/news-card";
import { AdvertisementCard } from "@/components/advertisement-card";
import { buildAdvertisingFeed, type DirectLinkCreative } from "@/lib/ads/direct-link";
import type { Article } from "@/lib/types";

export function NewsGrid({ articles, creative, featureFirst = false, className = "" }: {
  articles: Article[]; creative?: DirectLinkCreative | null; featureFirst?: boolean; className?: string;
}) {
  return <div className={`news-grid ${className}`}>{buildAdvertisingFeed(articles, Boolean(creative)).map((entry) => {
    if (entry.kind === "ad") return creative ? <AdvertisementCard key={`advertisement-${entry.key}`} creative={creative}/> : null;
    return featureFirst ? <div key={entry.item.id} className={entry.index === 0 ? "category-first-story" : ""}><NewsCard article={entry.item} featured={entry.index === 0}/></div>
      : <NewsCard key={entry.item.id} article={entry.item}/>;
  })}</div>;
}
