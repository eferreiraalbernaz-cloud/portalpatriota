import type { Metadata } from "next";
import { AdFreeBoundary } from "@/components/ad-free-boundary";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdFreeBoundary>{children}</AdFreeBoundary>;
}
