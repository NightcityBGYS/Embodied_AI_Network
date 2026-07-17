export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  siteUrl: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  if (!url || !anonKey || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    anonKey,
    serviceRoleKey,
    siteUrl,
  };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return config;
}

