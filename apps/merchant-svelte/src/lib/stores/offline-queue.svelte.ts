import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'kenya-commerce-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

export type QueueActionType = 'create_order' | 'record_payment' | 'correct_order';
export type QueueStatus = 'pending' | 'syncing' | 'failed';

export interface QueuedAction<T = unknown> {
  id: string;
  action: QueueActionType;
  data: T;
  timestamp: number;
  retry_count: number;
  last_error?: string;
  status: QueueStatus;
}

let pendingCount = $state(0);
let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

export function getPendingCount() {
  return pendingCount;
}

export function getIsOnline() {
  return isOnline;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
  });
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    }
  });
}

export async function enqueueAction<T>(
  action: QueueActionType,
  data: T
): Promise<QueuedAction<T>> {
  const entry: QueuedAction<T> = {
    id: crypto.randomUUID(),
    action,
    data,
    timestamp: Date.now(),
    retry_count: 0,
    status: 'pending'
  };

  const db = await getDb();
  await db.add(STORE_NAME, entry);
  await updatePendingCount();
  return entry;
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all.filter((item) => item.status === 'pending' || item.status === 'syncing');
}

export async function removeAction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
  await updatePendingCount();
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.status = 'failed';
    item.last_error = error;
    item.retry_count += 1;
    await db.put(STORE_NAME, item);
  }
  await updatePendingCount();
}

export async function updatePendingCount(): Promise<void> {
  const pending = await getPendingActions();
  pendingCount = pending.length;
}

if (typeof window !== 'undefined') {
  updatePendingCount();
}
