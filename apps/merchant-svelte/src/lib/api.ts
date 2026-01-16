import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { enqueueAction } from './stores/offline-queue.svelte';

const BASE_URL = `${PUBLIC_SUPABASE_URL}/functions/v1`;

export async function callEdgeFunction(name: string, data: unknown): Promise<unknown> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const actionType = name.replace('-', '_') as any;
    await enqueueAction(actionType, data);
    return { queued: true };
  }

  const response = await fetch(`${BASE_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}
