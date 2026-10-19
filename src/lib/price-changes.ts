import type { Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import { roundToCents } from "@/lib/recurring-obligations";

/*
 * Subscription price watch. Compares real charges for each subscription:
 *  - "increase"/"decrease": the latest charge differs from the one before it
 *  - "mismatch": the latest charge differs from the amount the user recorded
 * Review-only: nothing here edits a subscription. Updating a recorded amount
 * is always an explicit user action.
 */

export type PriceChangeKind = "increase" | "decrease" | "mismatch";

export type PriceChange = {
  subscriptionId: string;
  name: string;
  kind: PriceChangeKind;
  from: number;
  to: number;
  delta: number;
  pct: number;
  /** Date of the latest charge. */
  date: string;
  previousDate?: string;
  /** Yearly cost impact at the subscription's frequency. */
  annualImpact: number;
  chargeCount: number;
  matchedBy: "link" | "merchant";
};

const MIN_ABS_CHANGE = 0.5;
const MIN_PCT_CHANGE = 0.02;
const MIN_NAME_LENGTH = 4;

const PERIODS_PER_YEAR: Record<Subscription["frequency"], number> = {
  weekly: 52,
  monthly: 12,
  annual: 1,
  variable: 12,
};

export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(com|net|io|tv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function significant(from: number, to: number): boolean {
  const diff = Math.abs(to - from);
  return diff >= MIN_ABS_CHANGE && diff / Math.max(from, 0.01) >= MIN_PCT_CHANGE;
}

/** Charges for a subscription: explicit links win; otherwise a name match. */
export function chargesForSubscription(
  sub: Subscription,
  txns: MoneyTransaction[],
): { charges: MoneyTransaction[]; matchedBy: "link" | "merchant" } {
  const linked = txns.filter((t) => t.linkedSubscriptionId === sub.id && t.amount < 0);
  if (linked.length > 0) return { charges: linked, matchedBy: "link" };

  const key = normalizeMerchant(sub.name);
  if (key.length < MIN_NAME_LENGTH) return { charges: [], matchedBy: "merchant" };
  const matched = txns.filter((t) => {
    if (t.amount >= 0 || t.isTransferInternal) return false;
    if (t.classification !== "spending" && t.classification !== "review") return false;
    if (t.linkedSubscriptionId || t.linkedBillId) return false;
    // One direction only: "SPOTIFY USA" matches "Spotify", but a generic
    // "Amazon" purchase must not match "Amazon Prime".
    const m = normalizeMerchant(t.merchantName || t.description);
    if (!m.includes(key)) return false;
    // Name matches can include one-off purchases at the same merchant; skip
    // charges far from the recorded price.
    const amount = Math.abs(t.amount);
    return sub.amount <= 0 || (amount <= sub.amount * 3 && amount >= sub.amount / 3);
  });
  return { charges: matched, matchedBy: "merchant" };
}

export function detectPriceChanges(
  subscriptions: Subscription[],
  txns: MoneyTransaction[],
): PriceChange[] {
  const out: PriceChange[] = [];

  for (const sub of subscriptions) {
    if (sub.status === "cancel") continue;
    const { charges, matchedBy } = chargesForSubscription(sub, txns);
    if (charges.length === 0) continue;

    const sorted = [...charges].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const to = roundToCents(Math.abs(latest.amount));
    const periods = PERIODS_PER_YEAR[sub.frequency] ?? 12;

    if (previous) {
      const from = roundToCents(Math.abs(previous.amount));
      if (significant(from, to)) {
        out.push({
          subscriptionId: sub.id,
          name: sub.name,
          kind: to > from ? "increase" : "decrease",
          from,
          to,
          delta: roundToCents(to - from),
          pct: roundToCents(((to - from) / from) * 100),
          date: latest.date,
          previousDate: previous.date,
          annualImpact: roundToCents((to - from) * periods),
          chargeCount: sorted.length,
          matchedBy,
        });
        continue;
      }
    }

    // Charge history is steady, but the recorded amount is out of date.
    const recorded = roundToCents(sub.amount);
    if (recorded > 0 && significant(recorded, to)) {
      out.push({
        subscriptionId: sub.id,
        name: sub.name,
        kind: "mismatch",
        from: recorded,
        to,
        delta: roundToCents(to - recorded),
        pct: roundToCents(((to - recorded) / recorded) * 100),
        date: latest.date,
        annualImpact: roundToCents((to - recorded) * periods),
        chargeCount: sorted.length,
        matchedBy,
      });
    }
  }

  const rank: Record<PriceChangeKind, number> = { increase: 0, mismatch: 1, decrease: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.annualImpact - a.annualImpact);
}

/** Yearly cost of subscriptions the user is keeping, at recorded amounts. */
export function annualSubscriptionCost(subscriptions: Subscription[]): number {
  return roundToCents(
    subscriptions
      .filter((s) => s.status === "keep")
      .reduce((sum, s) => sum + s.amount * (PERIODS_PER_YEAR[s.frequency] ?? 12), 0),
  );
}
