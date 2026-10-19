import { describe, expect, it } from "vitest";
import { buildBalanceHistory, historyChange, type HistorySnapshot } from "@/lib/balance-history";

const snap = (
  accountId: string,
  accountType: string,
  snapshotDate: string,
  currentBalance: number | null,
  availableBalance: number | null = null,
): HistorySnapshot => ({ accountId, accountType, snapshotDate, currentBalance, availableBalance });

describe("buildBalanceHistory", () => {
  it("returns no points without snapshots", () => {
    const h = buildBalanceHistory([], []);
    expect(h.points).toEqual([]);
    expect(h.firstDate).toBeNull();
  });

  it("subtracts liabilities and separates cash from other assets", () => {
    const h = buildBalanceHistory([], [
      snap("chk", "checking", "2026-10-01", 2000),
      snap("sav", "savings", "2026-10-01", 5000),
      snap("inv", "investment", "2026-10-01", 10000),
      snap("cc", "credit", "2026-10-01", 750),
    ]);
    expect(h.points).toHaveLength(1);
    expect(h.points[0]).toMatchObject({
      netWorth: 16250,
      cash: 7000,
      assets: 17000,
      liabilities: 750,
      measuredCount: 4,
      carriedForward: [],
    });
  });

  it("creates points only on recorded days and flags carried-forward values", () => {
    const h = buildBalanceHistory([], [
      snap("chk", "checking", "2026-10-01", 1000),
      snap("cc", "credit", "2026-10-01", 200),
      snap("chk", "checking", "2026-10-05", 1500),
    ]);
    expect(h.points.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-05"]);
    expect(h.points[1].netWorth).toBe(1300);
    expect(h.points[1].measuredCount).toBe(1);
    expect(h.points[1].carriedForward).toEqual([{ accountId: "cc", fromDate: "2026-10-01" }]);
  });

  it("does not backfill an account before its first reading", () => {
    const h = buildBalanceHistory([], [
      snap("chk", "checking", "2026-10-01", 1000),
      snap("sav", "savings", "2026-10-03", 4000),
    ]);
    expect(h.points[0].netWorth).toBe(1000);
    expect(h.points[1].netWorth).toBe(5000);
  });

  it("falls back to available balance and skips empty readings", () => {
    const h = buildBalanceHistory([], [
      snap("chk", "checking", "2026-10-01", null, 900),
      snap("x", "checking", "2026-10-02", null, null),
    ]);
    expect(h.points).toHaveLength(1);
    expect(h.points[0].cash).toBe(900);
  });

  it("computes change across the window", () => {
    const h = buildBalanceHistory([], [
      snap("chk", "checking", "2026-10-01", 1000),
      snap("chk", "checking", "2026-10-09", 1240.5),
    ]);
    expect(historyChange(h.points, "netWorth")).toEqual({ from: 1000, to: 1240.5, delta: 240.5 });
    expect(historyChange(h.points.slice(0, 1), "netWorth")).toBeNull();
  });
});
