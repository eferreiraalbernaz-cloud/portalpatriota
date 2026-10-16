import type { Metadata, Viewport } from "next";
import { getSiteUrl } from "@/lib/config";
import { getPortalSettings } from "@/lib/articles";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPortalSettings();
  const name = settings.site_name || "PORTAL PATRIOTA BR";
  const description = settings.institutional_text || "Notícias do Brasil com contexto, clareza e responsabilidade.";
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: `${name} | Notícias do Brasil`, template: `%s | ${name}` },
    description,
    applicationName: name,
    openGraph: { type: "website", locale: "pt_BR", siteName: name, title: name, description },
    twitter: { card: "summary_large_image", title: name, description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = { themeColor: "#092A59", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
