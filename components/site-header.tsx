"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

export function SiteHeader({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); setSearchOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  return <>
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Portal Patriota BR, página inicial">
          <Image src={logoUrl || "/brand/portal-patriota-br.png"} alt="" width={82} height={64} priority className="brand-mark" />
          <span className="brand-name">{siteName}</span>
        </Link>
        <div className="header-tools">
          <button className="icon-button" aria-label="Abrir pesquisa" onClick={() => { setSearchOpen(true); setMenuOpen(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.6 4.6"/></svg>
          </button>
          <button className={`menu-button${menuOpen ? " is-active" : ""}`} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => { setMenuOpen((value) => !value); setSearchOpen(false); }}>
            <span/><span/><span/>
          </button>
        </div>
      </div>
    </header>

    <div className={`overlay${menuOpen ? " is-visible" : ""}`} aria-hidden={!menuOpen} onClick={() => setMenuOpen(false)} />
    <aside className={`side-menu${menuOpen ? " is-open" : ""}`} aria-label="Navegação principal" aria-hidden={!menuOpen} inert={!menuOpen}>
      <div className="side-menu-top"><span className="eyebrow">NAVEGUE PELO PORTAL</span><button className="close-button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>×</button></div>
      <nav className="menu-links">
        <Link href="/" onClick={() => setMenuOpen(false)}><span>Início</span><span>↗</span></Link>
        {CATEGORIES.map((category, index) => <Link key={category.slug} href={`/${category.slug}`} onClick={() => setMenuOpen(false)}><span>{category.name}</span><small>0{index + 1}</small></Link>)}
      </nav>
      <div className="side-menu-bottom"><span>ACESSO RESTRITO</span><Link href="/admin/login" onClick={() => setMenuOpen(false)}>É um administrador desta página?</Link></div>
    </aside>

    {searchOpen && <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Pesquisar notícias">
      <button className="search-dismiss" onClick={() => setSearchOpen(false)} aria-label="Fechar pesquisa">×</button>
      <form className="search-dialog" action="/busca">
        <label htmlFor="site-search">O que você quer saber?</label>
        <div className="search-line"><input id="site-search" name="q" type="search" placeholder="Buscar notícias..." autoFocus /><button type="submit" aria-label="Pesquisar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.6 4.6"/></svg></button></div>
        <p>Pesquise por assunto, título ou palavra-chave.</p>
      </form>
    </div>}
  </>;
}
