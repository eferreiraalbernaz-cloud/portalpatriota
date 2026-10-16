export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isAdminBackendConfigured() {
  return Boolean(isSupabaseConfigured() && getSupabaseSecretKey());
}

export function getMetaApiVersion() {
  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  if (!/^v\d+\.\d+$/.test(version)) throw new Error("META_GRAPH_API_VERSION inválida.");
  return version;
}
