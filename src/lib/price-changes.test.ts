import { describe, expect, it } from "vitest";
import type { Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import { annualSubscriptionCost, detectPriceChanges, normalizeMerchant } from "@/lib/price-changes";

function sub(o: Partial<Subscription> & Pick<Subscription, "id" | "name">): Subscription {
  return { amount: 15.49, frequency: "monthly", category: "Streaming", status: "keep", ...o };
}

let n = 0;
function charge(o: Partial<MoneyTransaction>): MoneyTransaction {
  n += 1;
  return {
    id: `t${n}`, accountId: "a", date: "2026-09-03", merchantName: "Netflix.com", description: "",
    amount: -15.49, type: "debit", classification: "spending", category: "Other",
    pending: false, source: "plaid_live", needsReview: false, ...o,
  } as MoneyTransaction;
}

describe("detectPriceChanges", () => {
  it("flags an increase between the last two charges with yearly impact", () => {
    const r = detectPriceChanges(
      [sub({ id: "nf", name: "Netflix" })],
      [
        charge({ date: "2026-08-03", amount: -15.49 }),
        charge({ date: "2026-09-03", amount: -15.49 }),
        charge({ date: "2026-10-03", amount: -17.99 }),
      ],
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      kind: "increase", from: 15.49, to: 17.99, delta: 2.5, annualImpact: 30,
      date: "2026-10-03", previousDate: "2026-09-03", chargeCount: 3, matchedBy: "merchant",
    });
    expect(r[0].pct).toBeCloseTo(16.14, 1);
  });

  it("prefers explicitly linked charges over name matches", () => {
    const r = detectPriceChanges(
      [sub({ id: "s1", name: "Streamer" })],
      [
        charge({ merchantName: "Something else", linkedSubscriptionId: "s1", date: "2026-09-01", amount: -10 }),
        charge({ merchantName: "Something else", linkedSubscriptionId: "s1", date: "2026-10-01", amount: -12 }),
        charge({ merchantName: "Streamer", date: "2026-10-02", amount: -99 }),
      ],
    );
    expect(r[0]).toMatchObject({ matchedBy: "link", from: 10, to: 12 });
  });

  it("reports a recorded-amount mismatch when charges are steady", () => {
    const r = detectPriceChanges(
      [sub({ id: "sp", name: "Spotify", amount: 10.99 })],
      [
        charge({ merchantName: "SPOTIFY USA", date: "2026-09-10", amount: -11.99 }),
        charge({ merchantName: "SPOTIFY USA", date: "2026-10-10", amount: -11.99 }),
      ],
    );
    expect(r[0]).toMatchObject({ kind: "mismatch", from: 10.99, to: 11.99, annualImpact: 12 });
  });

  it("ignores tiny changes, cancelled subscriptions, short names, and refunds", () => {
    const r = detectPriceChanges(
      [
        sub({ id: "a", name: "Netflix" }),
        sub({ id: "b", name: "Hulu", status: "cancel" }),
        sub({ id: "c", name: "X", amount: 5 }),
      ],
      [
        charge({ date: "2026-09-03", amount: -15.49 }),
        charge({ date: "2026-10-03", amount: -15.6 }),
        charge({ merchantName: "Hulu", date: "2026-09-01", amount: -8 }),
        charge({ merchantName: "Hulu", date: "2026-10-01", amount: -18 }),
        charge({ merchantName: "X", amount: -50 }),
        charge({ merchantName: "Netflix", date: "2026-10-04", amount: 17.99, classification: "refund" }),
      ],
    );
    expect(r).toEqual([]);
  });

  it("does not match a broader merchant name or one-off purchases", () => {
    const r = detectPriceChanges(
      [sub({ id: "ap", name: "Amazon Prime", amount: 14.99 })],
      [
        charge({ merchantName: "Amazon", date: "2026-10-09", amount: -23.49 }),
        charge({ merchantName: "Amazon", date: "2026-10-18", amount: -64.99 }),
      ],
    );
    expect(r).toEqual([]);
    const r2 = detectPriceChanges(
      [sub({ id: "nf", name: "Netflix", amount: 15.49 })],
      [
        charge({ date: "2026-09-03", amount: -15.49 }),
        charge({ date: "2026-10-03", amount: -120 }),
      ],
    );
    expect(r2).toEqual([]);
  });

  it("normalizes merchant names", () => {
    expect(normalizeMerchant("Netflix.com")).toBe("netflix");
    expect(normalizeMerchant("SPOTIFY USA")).toBe("spotifyusa");
  });

  it("annualizes kept subscriptions only", () => {
    expect(
      annualSubscriptionCost([
        sub({ id: "1", name: "A", amount: 10 }),
        sub({ id: "2", name: "B", amount: 100, frequency: "annual" }),
        sub({ id: "3", name: "C", amount: 5, status: "review" }),
      ]),
    ).toBe(220);
  });
});
