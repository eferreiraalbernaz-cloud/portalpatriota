import "server-only";
import { cache } from "react";
import { createPublicSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUrl, isAdminBackendConfigured } from "@/lib/config";
import { creativeIssues, EMPTY_CREATIVE, type DirectLinkCreative } from "@/lib/ads/direct-link";

const FIELDS = "enabled,image_url,title,description,target_url,review_confirmed";
export type CreativeAdminState = { creative: DirectLinkCreative; storageReady: boolean; error: string | null };

export const getPublicCreative = cache(async (): Promise<DirectLinkCreative | null> => {
  try {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from("advertising_creative").select(FIELDS).eq("id", 1).eq("enabled", true).maybeSingle();
    if (error || !data || !data.enabled || creativeIssues(data, getSupabaseUrl() || "").length) return null;
    return data;
  } catch { return null; }
});

export async function readCreativeAdminState(): Promise<CreativeAdminState> {
  const state: CreativeAdminState = { creative: { ...EMPTY_CREATIVE }, storageReady: false, error: null };
  if (!isAdminBackendConfigured()) return { ...state, error: "Configure o backend administrativo antes de salvar os cards." };
  try {
    const { data, error } = await createServiceSupabaseClient().from("advertising_creative").select(FIELDS).eq("id", 1).maybeSingle();
    if (error) return { ...state, error: "Não foi possível consultar os cards. Verifique a migração direct_link_cards e o Supabase." };
    return { ...state, storageReady: true, creative: data || { ...EMPTY_CREATIVE } };
  } catch { return { ...state, error: "Não foi possível acessar o Supabase. Tente novamente." }; }
}
