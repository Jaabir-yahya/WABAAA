export type QueueActionType = "create_order" | "record_payment" | "correct_order";

export type QueueStatus = "pending" | "syncing" | "failed";

export interface QueuedAction<T = unknown> {
  id: string;
  action: QueueActionType;
  data: T;
  timestamp: number;
  retry_count: number;
  last_error?: string;
  status: QueueStatus;
}

const DB_NAME = "kenya-commerce-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";
const TIMESTAMP_INDEX = "timestamp";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex(TIMESTAMP_INDEX, "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueAction<T>(
  action: QueueActionType,
  data: T,
): Promise<QueuedAction<T>> {
  const entry: QueuedAction<T> = {
    id: crypto.randomUUID(),
    action,
    data,
    timestamp: Date.now(),
    retry_count: 0,
    status: "pending",
  };

  await withStore("readwrite", (store) => store.add(entry));
  return entry;
}

export async function getAllActions(): Promise<QueuedAction[]> {
  return await withStore("readonly", (store) => store.getAll());
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index(TIMESTAMP_INDEX);
    const request = index.getAll();

    request.onsuccess = () => {
      const result = (request.result as QueuedAction[]).filter(
        (item) => item.status === "pending" || item.status === "syncing",
      );
      resolve(result);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFailedActions(): Promise<QueuedAction[]> {
  const items = await getAllActions();
  return items.filter((item) => item.status === "failed");
}

async function updateAction(
  id: string,
  updater: (item: QueuedAction) => QueuedAction,
): Promise<QueuedAction | null> {
  const existing = await withStore<QueuedAction | undefined>("readonly", (store) =>
    store.get(id),
  );

  if (!existing) {
    return null;
  }

  const updated = updater(existing);
  await withStore("readwrite", (store) => store.put(updated));
  return updated;
}

export async function markSyncing(id: string) {
  return await updateAction(id, (item) => ({ ...item, status: "syncing" }));
}

export async function markFailed(id: string, error: string) {
  return await updateAction(id, (item) => ({
    ...item,
    status: "failed",
    retry_count: item.retry_count + 1,
    last_error: error,
  }));
}

export async function markRetry(id: string, error: string) {
  return await updateAction(id, (item) => ({
    ...item,
    status: "pending",
    retry_count: item.retry_count + 1,
    last_error: error,
  }));
}

export async function markPending(id: string) {
  return await updateAction(id, (item) => ({ ...item, status: "pending" }));
}

export async function removeAction(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearQueue() {
  await withStore("readwrite", (store) => store.clear());
}
