// Browser storage for per-device UI state only. Financial data is never kept
// here: signed-in data lives in the database, and the signed-out preview is
// held in memory. Safe to import on the server (every helper is a no-op there).

import type { ConsentRecord } from "@/types/user";

export const STORAGE_KEYS = {
  consentHistory: "moneyos:consent-history",
  pendingPlaidConnect: "moneyos:pending-plaid-connect",
  setupSkippedBills: "moneyos:setup-skipped-bills",
  setupSkippedSubscriptions: "moneyos:setup-skipped-subscriptions",
  /** Preview-only transaction review decisions (never applied when signed in). */
  transactionReviewOverrides: "moneyos:transaction-review-overrides",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isBrowser = () => typeof window !== "undefined";

export function saveString(key: StorageKey, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota) — UI state only, safe to drop.
  }
}

export function loadBoolean(key: StorageKey): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function loadConsentHistory(): ConsentRecord[] {
  if (!isBrowser()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.consentHistory) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ConsentRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveConsentHistory(records: ConsentRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.consentHistory, JSON.stringify(records));
  } catch {
    // Server keeps the authoritative consent record for signed-in users.
  }
}

/**
 * Globally unique record id. Ids are primary keys shared by every account, so
 * they must be collision-resistant (full UUID, not a short random suffix).
 */
export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}
