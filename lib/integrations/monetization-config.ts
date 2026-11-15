import "server-only";

import { getSiteUrl, isAdminBackendConfigured } from "@/lib/config";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { MonetizationStatus } from "@/lib/monetization";

export async function readMonetizationStatus(): Promise<MonetizationStatus> {
  const status: MonetizationStatus = { enabled: false, zoneId: "", siteOrigin: "", storageReady: false, error: null };
  try {
    const url = new URL(getSiteUrl());
    status.siteOrigin = url.origin;
    if (url.protocol !== "https:" || url.hostname === "localhost" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      status.error = "Configure NEXT_PUBLIC_SITE_URL com a origem HTTPS pública do portal e confirme o mesmo domínio no Monetag.";
    }
  } catch {
    status.error = "NEXT_PUBLIC_SITE_URL inválida. Configure a origem HTTPS pública do portal.";
  }
  if (!isAdminBackendConfigured()) {
    status.error = "Configure o backend administrativo do Supabase para salvar a monetização.";
    return status;
  }
  try {
    const { data, error } = await createServiceSupabaseClient().from("monetization_config")
      .select("zone_id").eq("id", 1).maybeSingle();
    if (error) {
      status.error = "Não foi possível consultar a monetização. Verifique a migração monetag_ipp_configuration e o acesso ao Supabase.";
      return status;
    }
    status.storageReady = true;
    status.zoneId = data?.zone_id || "";
  } catch {
    status.error = "Não foi possível acessar a configuração de monetização. Verifique o Supabase.";
  }
  return status;
}
