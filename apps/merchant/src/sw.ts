/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const DB_NAME = "kenya-commerce-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";
const TIMESTAMP_INDEX = "timestamp";

precacheAndRoute(self.__WB_MANIFEST);

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

async function getPendingActions() {
  const db = await openDb();
  return new Promise<Array<{ id: string; action: string; data: unknown }>>(
    (resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index(TIMESTAMP_INDEX);
      const request = index.getAll();

      request.onsuccess = () => {
        const result = (request.result as Array<{ status: string }>).filter(
          (item) => item.status === "pending" || item.status === "syncing",
        );
        resolve(result as Array<{ id: string; action: string; data: unknown }>);
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    },
  );
}

async function removeAction(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncQueue() {
  const pending = await getPendingActions();
  if (pending.length === 0) return;

  for (const action of pending) {
    try {
      const endpoint = `${SUPABASE_URL}/functions/v1/${action.action.replace(/_/g, "-")}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(action.data),
      });

      if (response.ok) {
        await removeAction(action.id);
      }
    } catch (_error) {
      // Leave in queue for next retry
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-queue") {
    event.waitUntil(syncQueue());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-sync") {
    event.waitUntil(syncQueue());
  }
});
