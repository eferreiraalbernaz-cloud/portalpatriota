import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicKey, getSupabaseUrl, getSupabaseSecretKey } from "@/lib/config";

export async function createServerSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) throw new Error("Supabase não está configurado.");
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components não podem gravar cookies. O proxy atualiza a sessão.
        }
      },
    },
  });
}

export function createPublicSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createServiceSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) throw new Error("A chave privada do Supabase não está configurada.");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
