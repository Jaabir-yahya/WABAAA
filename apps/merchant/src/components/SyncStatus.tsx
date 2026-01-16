import { useSync } from "../hooks/useSync";

function getLabel(status: ReturnType<typeof useSync>["status"]) {
  switch (status.type) {
    case "online":
      return { text: "Imeunganishwa", style: "bg-green-50 border-green-200 text-green-800" };
    case "offline":
      return {
        text: `Offline (${status.pending} zinasubiri)`,
        style: "bg-amber-50 border-amber-200 text-amber-800",
      };
    case "syncing":
      return {
        text: `Inaunganisha... (${status.current}/${status.total})`,
        style: "bg-blue-50 border-blue-200 text-blue-800",
      };
    case "failed":
      return {
        text: `Imeshindwa (${status.failed})`,
        style: "bg-red-50 border-red-200 text-red-800",
      };
    default:
      return { text: "Inaunganisha...", style: "bg-blue-50 border-blue-200 text-blue-800" };
  }
}

export default function SyncStatus() {
  const { status, syncNow } = useSync();
  const label = getLabel(status);

  return (
    <div className={`sticky top-0 z-20 border-b px-4 py-2 text-sm ${label.style}`}>
      <div className="flex items-center justify-between gap-2">
        <span>{label.text}</span>
        {status.type !== "syncing" && status.type !== "online" ? (
          <button
            className="rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm"
            onClick={syncNow}
            type="button"
          >
            Jaribu Tena
          </button>
        ) : null}
      </div>
      {status.type === "syncing" ? (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.max(10, (status.current / status.total) * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
