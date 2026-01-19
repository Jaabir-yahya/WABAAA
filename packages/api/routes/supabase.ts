import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedSupabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedSupabase = createClient(url, serviceKey);
  return cachedSupabase;
}

export async function setBusinessContext(
  supabase: SupabaseClient,
  businessId: string
): Promise<void> {
  const { error } = await supabase.rpc('set_business_context', {
    p_business_id: businessId,
  });

  if (error) {
    throw new Error(`Failed to set business context: ${error.message}`);
  }
}

export async function getSupabaseWithContext(
  businessId: string
): Promise<SupabaseClient> {
  const supabase = getSupabaseClient();
  await setBusinessContext(supabase, businessId);
  return supabase;
}
