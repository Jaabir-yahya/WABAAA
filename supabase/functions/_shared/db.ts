import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const url =
    Deno.env.get("SUPABASE_URL") ??
    Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ??
    "";

  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    "";

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  cachedClient = createClient(url, key, {
    db: {
      schema: "api",
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  } as any) as any;

  return cachedClient as any;
}
