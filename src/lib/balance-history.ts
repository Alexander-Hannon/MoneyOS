import { roundToCents } from "@/lib/recurring-obligations";

/*
 * Net-worth history built ONLY from recorded balance snapshots.
 *
 * - A point exists only on a day at least one balance was actually recorded.
 * - An account contributes only from its first recorded day onward.
 * - On a day where some accounts weren't re-read, their most recent earlier
 *   reading is used and the point is flagged so the UI can say so.
 * Nothing is interpolated, smoothed, or backfilled.
 */

export type HistoryAccount = {
  id: string;
  name: string;
  institution: string;
  type: string;
  mask: string | null;
};

export type HistorySnapshot = {
  accountId: string;
  accountType: string;
  snapshotDate: string;
  currentBalance: number | null;
  availableBalance: number | null;
};

export type HistoryPoint = {
  date: string;
  netWorth: number;
  cash: number;
  assets: number;
  liabilities: number;
  /** Accounts with a reading recorded on this exact day. */
  measuredCount: number;
  /** Accounts whose value comes from an earlier day's reading. */
  carriedForward: Array<{ accountId: string; fromDate: string }>;
};

export type BalanceHistory = {
  points: HistoryPoint[];
  accounts: HistoryAccount[];
  firstDate: string | null;
  lastDate: string | null;
  /** Most recent recorded reading for each account. */
  latestByAccount: Array<{ accountId: string; accountType: string; date: string; value: number }>;
};

const CASH_TYPES = new Set(["checking", "savings", "cash"]);
const LIABILITY_TYPES = new Set(["credit", "loan"]);

export function isLiabilityType(type: string): boolean {
  return LIABILITY_TYPES.has(type);
}

function snapshotValue(s: HistorySnapshot): number | null {
  return s.currentBalance ?? s.availableBalance ?? null;
}

export function buildBalanceHistory(
  accounts: HistoryAccount[],
  snapshots: HistorySnapshot[],
): BalanceHistory {
  const byDate = new Map<string, HistorySnapshot[]>();
  for (const s of snapshots) {
    if (snapshotValue(s) == null) continue;
    const list = byDate.get(s.snapshotDate) ?? [];
    list.push(s);
    byDate.set(s.snapshotDate, list);
  }
  const dates = [...byDate.keys()].sort();

  const latest = new Map<string, { snap: HistorySnapshot; date: string }>();
  const points: HistoryPoint[] = [];

  for (const date of dates) {
    const today = byDate.get(date)!;
    for (const s of today) latest.set(s.accountId, { snap: s, date });

    let assets = 0;
    let liabilities = 0;
    let cash = 0;
    const carriedForward: HistoryPoint["carriedForward"] = [];

    for (const [accountId, { snap, date: readDate }] of latest) {
      const value = snapshotValue(snap)!;
      if (isLiabilityType(snap.accountType)) {
        liabilities += Math.abs(value);
      } else {
        assets += value;
        if (CASH_TYPES.has(snap.accountType)) cash += value;
      }
      if (readDate !== date) carriedForward.push({ accountId, fromDate: readDate });
    }

    points.push({
      date,
      netWorth: roundToCents(assets - liabilities),
      cash: roundToCents(cash),
      assets: roundToCents(assets),
      liabilities: roundToCents(liabilities),
      measuredCount: today.length,
      carriedForward,
    });
  }

  return {
    points,
    accounts,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    latestByAccount: [...latest].map(([accountId, { snap, date }]) => ({
      accountId,
      accountType: snap.accountType,
      date,
      value: snapshotValue(snap)!,
    })),
  };
}

/** Change between the first and last recorded points in a window. */
export function historyChange(
  points: HistoryPoint[],
  key: "netWorth" | "cash",
): { from: number; to: number; delta: number } | null {
  if (points.length < 2) return null;
  const from = points[0][key];
  const to = points[points.length - 1][key];
  return { from, to, delta: roundToCents(to - from) };
}
