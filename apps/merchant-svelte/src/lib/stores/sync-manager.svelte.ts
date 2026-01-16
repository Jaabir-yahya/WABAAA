import { getPendingActions, markFailed, removeAction } from './offline-queue.svelte';
import { callEdgeFunction } from '../api';

let syncState = $state<'idle' | 'syncing' | 'error'>('idle');

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

export function getSyncStatus() {
  return syncState;
}

export async function syncAll(): Promise<void> {
  if (syncState === 'syncing') return;

  syncState = 'syncing';

  try {
    const pending = await getPendingActions();

    for (const action of pending) {
      if (action.retry_count >= MAX_RETRIES) {
        await markFailed(action.id, 'Max retries exceeded');
        continue;
      }

      try {
        await callEdgeFunction(action.action.replace('_', '-'), action.data);
        await removeAction(action.id);
      } catch (error) {
        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, action.retry_count);
        await markFailed(action.id, String(error));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    syncState = 'idle';
  } catch (error) {
    syncState = 'error';
    console.error('Sync failed:', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(syncAll, 1000);
  });
}
