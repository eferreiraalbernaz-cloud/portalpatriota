import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";

export type AdminSession = { id: string; email: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return null;
    const { data: membership, error: membershipError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError || !membership) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin).origin;
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
    return supplied === expected;
  } catch {
    return false;
  }
}
