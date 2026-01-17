/**
 * KCOS Idempotency Client
 *
 * Ensures actions can be safely retried without duplication.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedSupabase = createClient(url, serviceKey);
  return cachedSupabase;
}

export interface IdempotencyResult<T> {
  isNew: boolean;
  result: T;
}

/**
 * Execute a function with idempotency.
 */
export async function withIdempotency<T>(
  tenantId: string,
  idempotencyKey: string,
  operationType: string,
  payload: unknown,
  fn: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  const supabase = getSupabaseClient();
  const requestHash = hashPayload(payload);

  // Check existing record
  const { data: existing, error: selectError } = await supabase
    .from('idempotency_keys')
    .select('response, request_hash')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .eq('operation_type', operationType)
    .maybeSingle();

  if (existing && !selectError) {
    // If payload hash differs, reject
    if (existing.request_hash !== requestHash) {
      throw new Error('Idempotency key reuse with different payload');
    }

    return { isNew: false, result: existing.response as T };
  }

  // Execute function
  const result = await fn();

  // Store idempotency record
  const { error: insertError } = await supabase
    .from('idempotency_keys')
    .insert({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation_type: operationType,
      request_hash: requestHash,
      response: result,
      status: 'completed',
    });

  if (insertError) {
    // Don't fail the operation if idempotency logging fails
    console.warn('[idempotency] Failed to store idempotency key:', insertError.message);
  }

  return { isNew: true, result };
}

function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload ?? {});
  return createHash('sha256').update(json).digest('hex');
}
