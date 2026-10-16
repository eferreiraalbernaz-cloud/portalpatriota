import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import type { Article, PortalSettings } from "@/lib/types";
import { EmptyState, NewsCard } from "@/components/news-card";

export function HomeContent({ articles, settings }: { articles: Article[]; settings: PortalSettings }) {
  const lead = articles.find((article) => article.highlighted) || articles[0];
  const rest = articles.filter((article) => article.id !== lead?.id);
  return <main>
    <section className="home-hero container">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="live-dot"/> NOTÍCIAS DO BRASIL</div>
        <h1>Informação que acompanha <em>o Brasil.</em></h1>
        <p>{settings.institutional_text}</p>
        <div className="hero-actions"><a className="button button-primary" href="#ultimas">Acompanhe as notícias <span>↓</span></a><span className="hero-dateline">JORNALISMO • CONTEXTO • RESPONSABILIDADE</span></div>
      </div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-sun"/><div className="hero-grid"/><div className="hero-caption"><span>PORTAL</span><strong>PATRIOTA<br/>BR</strong><small>INFORMAÇÃO EM MOVIMENTO</small></div><div className="hero-index">01 <span>/</span> 05</div></div>
    </section>

    {lead ? <section className="container lead-section"><div className="section-heading"><div><span className="eyebrow">AGORA NO PORTAL</span><h2>Em destaque</h2></div><Link className="text-link" href={`/${CATEGORIES.find((c) => c.name === lead.category)?.slug || "brasil"}/${lead.slug}`}>Ver matéria <span>↗</span></Link></div><NewsCard article={lead} featured/></section>
      : <section className="container setup-note"><span className="setup-note-mark">01</span><div><span className="eyebrow">PORTAL PATRIOTA BR</span><h2>As notícias começam aqui.</h2><p>O portal está pronto para receber publicações e matérias. Assim que o banco e as integrações forem configurados, o conteúdo publicado aparecerá nesta página.</p></div><span className="setup-spark">✳</span></section>}

    <section className="container latest-section" id="ultimas">
      <div className="section-heading"><div><span className="eyebrow">ACOMPANHE O QUE IMPORTA</span><h2>Últimas notícias</h2></div><span className="section-count">{String(articles.length).padStart(2,"0")} <small>MATÉRIAS</small></span></div>
      {rest.length ? <div className="news-grid">{rest.slice(0, 6).map((article) => <NewsCard key={article.id} article={article}/>)}</div> : <EmptyState title={lead ? "Você está em dia." : "Nenhuma notícia publicada ainda."} detail={lead ? "Volte em breve para acompanhar as próximas atualizações." : "Quando uma matéria for publicada, ela será exibida automaticamente nesta seção."}/>}
    </section>

    <section className="category-band"><div className="container category-band-inner"><div><span className="eyebrow">ESCOLHA SUA EDITORIA</span><h2>O Brasil por diferentes ângulos.</h2></div><div className="category-pills">{CATEGORIES.map((category, index) => <Link key={category.slug} href={`/${category.slug}`}><span>0{index + 1}</span>{category.name}<b>↗</b></Link>)}</div></div></section>

    {CATEGORIES.map((category) => {
      const categoryArticles = articles.filter((article) => article.category === category.name).slice(0, 3);
      if (!categoryArticles.length) return null;
      return <section className="container category-feed" key={category.slug}><div className="section-heading"><div><span className="eyebrow">EDITORIA</span><h2>{category.label}</h2></div><Link className="text-link" href={`/${category.slug}`}>Ver todas <span>↗</span></Link></div><div className="news-grid">{categoryArticles.map((article) => <NewsCard key={article.id} article={article}/>)}</div></section>;
    })}
  </main>;
}
