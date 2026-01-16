import { useEffect, useState } from "react";
import { getSyncStatus, subscribeSync, syncQueue } from "../lib/sync-manager";

export function useSync() {
  const [status, setStatus] = useState(getSyncStatus());
  const [lastSuccessId, setLastSuccessId] = useState<string | undefined>();
  const [lastFailureId, setLastFailureId] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = subscribeSync((event) => {
      setStatus(event.status);
      if (event.lastSuccessId) {
        setLastSuccessId(event.lastSuccessId);
      }
      if (event.lastFailureId) {
        setLastFailureId(event.lastFailureId);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    status,
    lastSuccessId,
    lastFailureId,
    syncNow: () => syncQueue(),
  };
}
