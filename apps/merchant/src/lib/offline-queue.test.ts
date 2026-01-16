import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  clearQueue,
  enqueueAction,
  getAllActions,
  getFailedActions,
  getPendingActions,
  markFailed,
  removeAction,
} from "./offline-queue";

describe("offline queue", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it("enqueues and retrieves pending actions", async () => {
    await enqueueAction("create_order", { foo: "bar" });
    const pending = await getPendingActions();
    expect(pending.length).toBe(1);
    expect(pending[0].action).toBe("create_order");
  });

  it("marks action failed and increments retry count", async () => {
    const action = await enqueueAction("record_payment", { amount: 10 });
    await markFailed(action.id, "Network error");
    const failed = await getFailedActions();
    expect(failed.length).toBe(1);
    expect(failed[0].retry_count).toBe(1);
    expect(failed[0].last_error).toBe("Network error");
  });

  it("removes actions after success", async () => {
    const action = await enqueueAction("correct_order", { field: "items" });
    await removeAction(action.id);
    const all = await getAllActions();
    expect(all.length).toBe(0);
  });
});
