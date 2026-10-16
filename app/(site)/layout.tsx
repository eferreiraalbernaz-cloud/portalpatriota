import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPortalSettings } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPortalSettings();
  return <>
    <div className="topline"><div className="container topline-inner"><span><i/> JORNALISMO COM RESPONSABILIDADE</span><span className="topline-right">PORTAL DE NOTÍCIAS • BRASIL</span></div></div>
    <SiteHeader siteName={settings.site_name} logoUrl={settings.logo_url}/>
    {children}
    <SiteFooter settings={settings}/>
  </>;
}
