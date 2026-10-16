import "server-only";

import { getSupabaseUrl } from "@/lib/config";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export function getManagedMediaPath(value: string | null | undefined) {
  const configured = getSupabaseUrl();
  if (!value || !configured) return null;
  try {
    const url = new URL(value);
    const base = new URL(configured);
    const prefix = "/storage/v1/object/public/portal-media/";
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path || path.startsWith("/") || path.split("/").some((part) => part === ".." || part === ".")) return null;
    if (!path.startsWith("editor/") && !path.startsWith("instagram/")) return null;
    return path;
  } catch {
    return null;
  }
}

export async function removeManagedMedia(value: string | null | undefined) {
  const path = getManagedMediaPath(value);
  if (!path) return;
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.storage.from("portal-media").remove([path]);
  if (error) console.warn("Não foi possível remover uma imagem órfã do armazenamento.", { bucket: "portal-media" });
}
