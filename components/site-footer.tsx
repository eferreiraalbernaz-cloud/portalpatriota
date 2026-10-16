import Link from "next/link";
import type { PortalSettings } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

export function SiteFooter({ settings }: { settings: PortalSettings }) {
  const socials = [
    ["Instagram", settings.instagram_url],
    ["Facebook", settings.facebook_url],
    ["YouTube", settings.youtube_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return <footer className="site-footer">
    <div className="footer-top container">
      <div className="footer-brand"><span className="footer-monogram">PP</span><div><strong>{settings.site_name}</strong><p>{settings.institutional_text}</p></div></div>
      <div className="footer-column"><span className="footer-label">EDITORIAS</span>{CATEGORIES.map((category) => <Link key={category.slug} href={`/${category.slug}`}>{category.label}</Link>)}</div>
      <div className="footer-column"><span className="footer-label">ACOMPANHE</span>{socials.length ? socials.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label}<span>↗</span></a>) : <span className="footer-muted">Redes sociais em breve</span>}</div>
    </div>
    <div className="footer-bottom"><div className="container footer-bottom-inner"><span>© {new Date().getFullYear()} {settings.site_name}. Todos os direitos reservados. <Link className="privacy-link" href="/privacidade">Privacidade</Link></span><span className="credit">Desenvolvido por {settings.albr_contact_url ? <a href={settings.albr_contact_url} target="_blank" rel="noreferrer">ALBR</a> : <strong>ALBR</strong>}.</span></div></div>
  </footer>;
}
