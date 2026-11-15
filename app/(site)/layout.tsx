import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPortalSettings } from "@/lib/articles";
import { getSiteUrl } from "@/lib/config";
import { MonetagAdvertising } from "@/components/monetag-advertising";
import { headers } from "next/headers";
import { requiresAdvertisingConsent } from "@/lib/advertising";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, requestHeaders] = await Promise.all([getPortalSettings(), headers()]);
  const requireConsent = requiresAdvertisingConsent(requestHeaders.get("x-portal-viewer-country"));
  return <>
    <div className="topline"><div className="container topline-inner"><span><i/> JORNALISMO COM RESPONSABILIDADE</span><span className="topline-right">PORTAL DE NOTÍCIAS • BRASIL</span></div></div>
    <SiteHeader siteName={settings.site_name} logoUrl={settings.logo_url}/>
    {children}
    <SiteFooter settings={settings}/>
    {process.env.MONETAG_IPP_DISABLED !== "true" && <MonetagAdvertising siteOrigin={getSiteUrl()} requireConsent={requireConsent}/>}
  </>;
}
