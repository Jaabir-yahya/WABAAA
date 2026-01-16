import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SyncStatus from "./SyncStatus";

vi.mock("../hooks/useSync", () => ({
  useSync: () => ({
    status: { type: "offline", pending: 2 },
    syncNow: vi.fn(),
  }),
}));

describe("SyncStatus", () => {
  it("shows offline status in Swahili", () => {
    render(<SyncStatus />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(screen.getByText(/zinasubiri/)).toBeInTheDocument();
  });
});
