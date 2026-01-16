import {
  getFailedActions,
  getPendingActions,
  markFailed,
  markRetry,
  markSyncing,
  removeAction,
  type QueuedAction,
} from "./offline-queue";

type SyncStatus =
  | { type: "online"; pending: number }
  | { type: "offline"; pending: number }
  | { type: "syncing"; current: number; total: number; pending: number }
  | { type: "failed"; pending: number; failed: number };

type SyncEvent = {
  status: SyncStatus;
  lastSuccessId?: string;
  lastFailureId?: string;
};

const eventTarget = new EventTarget();
let currentStatus: SyncStatus = { type: "online", pending: 0 };
let isSyncing = false;
const delays = [1000, 2000, 4000, 8000, 16000];
const maxRetries = 5;

function emit(event: SyncEvent) {
  eventTarget.dispatchEvent(
    new CustomEvent("sync", {
      detail: event,
    }),
  );
}

function setStatus(status: SyncStatus, event?: Partial<SyncEvent>) {
  currentStatus = status;
  emit({
    status,
    ...event,
  });
}

function getBaseUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) {
    throw new Error("VITE_SUPABASE_URL not configured");
  }
  return `${base}/functions/v1`;
}

function getAnonKey() {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
}

async function callEdgeFunction(action: QueuedAction) {
  const endpoint = `${getBaseUrl()}/${String(action.action).replace(/_/g, "-")}`;
  const response = await fetch(
    endpoint,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getAnonKey(),
      Authorization: `Bearer ${getAnonKey()}`,
    },
    body: JSON.stringify(action.data),
    },
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "Request failed");
  }

  return await response.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processAction(action: QueuedAction, index: number, total: number) {
  setStatus({ type: "syncing", current: index + 1, total, pending: total - index });
  await markSyncing(action.id);

  const delay = delays[Math.min(action.retry_count, delays.length - 1)];
  if (action.retry_count > 0) {
    await sleep(delay);
  }

  try {
    await callEdgeFunction(action);
    await removeAction(action.id);
    emit({ status: currentStatus, lastSuccessId: action.id });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    if (action.retry_count + 1 >= maxRetries) {
      await markFailed(action.id, message);
    } else {
      await markRetry(action.id, message);
    }
    emit({ status: currentStatus, lastFailureId: action.id });
    return false;
  }
}

export async function syncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) {
    const pending = await getPendingActions();
    setStatus({ type: "offline", pending: pending.length });
    return;
  }

  isSyncing = true;
  const pending = await getPendingActions();
  if (pending.length === 0) {
    setStatus({ type: "online", pending: 0 });
    isSyncing = false;
    return;
  }

  for (let i = 0; i < pending.length; i += 1) {
    await processAction(pending[i], i, pending.length);
  }

  const remaining = await getPendingActions();
  const failed = await getFailedActions();
  if (failed.length > 0) {
    setStatus({ type: "failed", pending: remaining.length, failed: failed.length });
  } else {
    setStatus({ type: "online", pending: remaining.length });
  }

  isSyncing = false;
}

export async function initSyncManager() {
  const pending = await getPendingActions();
  if (!navigator.onLine) {
    setStatus({ type: "offline", pending: pending.length });
  } else if (pending.length > 0) {
    setStatus({ type: "syncing", current: 0, total: pending.length, pending: pending.length });
    await syncQueue();
  } else {
    setStatus({ type: "online", pending: 0 });
  }

  window.addEventListener("online", () => {
    syncQueue();
  });

  window.addEventListener("offline", async () => {
    const updated = await getPendingActions();
    setStatus({ type: "offline", pending: updated.length });
  });

  await registerBackgroundSync();
}

export function getSyncStatus() {
  return currentStatus;
}

export function subscribeSync(listener: (event: SyncEvent) => void) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<SyncEvent>).detail);
  };
  eventTarget.addEventListener("sync", handler);
  return () => eventTarget.removeEventListener("sync", handler);
}

export async function registerBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const extended = registration as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
    periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
  };

  if (extended.sync) {
    try {
      await extended.sync.register("sync-queue");
    } catch (_error) {
      // Not supported or permission denied
    }
  }
  if (extended.periodicSync) {
    try {
      await extended.periodicSync.register("periodic-sync", {
        minInterval: 15 * 60 * 1000,
      });
    } catch (_error) {
      // Not supported or permission denied
    }
  }
}
