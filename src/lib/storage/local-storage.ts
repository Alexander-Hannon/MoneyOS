// Thin, framework-agnostic localStorage layer. Safe to import on the server
// (every function no-ops when `window` is undefined).

import type { AppMode } from "@/types/app-mode";
import type { ConsentRecord } from "@/types/user";

export const STORAGE_KEYS = {
  bills: "moneyos:bills",
  income: "moneyos:income",
  subscriptions: "moneyos:subscriptions",
  alerts: "moneyos:alerts",
  spendingLater: "moneyos:spending-later",
  manualAccounts: "moneyos:manual-accounts",
  appMode: "moneyos:app-mode",
  onboardingCompleted: "moneyos:onboarding-completed",
  consentHistory: "moneyos:consent-history",
  pendingPlaidConnect: "moneyos:pending-plaid-connect",
  migrationCompleted: "moneyos:migration-completed",
  accountDataSyncedAt: "moneyos:account-data-synced-at",
  accountDataLocalModifiedAt: "moneyos:account-data-local-modified-at",
  accountSyncDiagnostics: "moneyos:account-sync-diagnostics",
  transactionReviewOverrides: "moneyos:transaction-review-overrides",
  dismissedRecurring: "moneyos:dismissed-recurring",
  dismissedActions: "moneyos:dismissed-actions",
  weeklyReviews: "moneyos:weekly-reviews",
  setupSkippedBills: "moneyos:setup-skipped-bills",
  setupSkippedSubscriptions: "moneyos:setup-skipped-subscriptions",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isBrowser = (): boolean => typeof window !== "undefined";

/** Load a collection from localStorage, falling back to defaults. */
export function loadCollection<T>(key: StorageKey, fallback: T[]): T[] {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Persist a collection to localStorage. */
export function saveCollection<T>(key: StorageKey, data: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore quota / serialization errors — this is a local convenience tool.
  }
}

export function loadString(key: StorageKey): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

export function saveString(key: StorageKey, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

export function loadBoolean(key: StorageKey): boolean {
  return loadString(key) === "true";
}

export function saveBoolean(key: StorageKey, value: boolean): void {
  saveString(key, value ? "true" : "false");
}

export function loadAppModeFromStorage(): AppMode | null {
  const raw = loadString(STORAGE_KEYS.appMode);
  if (
    raw === "demo" ||
    raw === "local_user" ||
    raw === "plaid_sandbox" ||
    raw === "personal_live" ||
    raw === "future_plaid_live"
  ) {
    return raw === "future_plaid_live" ? "personal_live" : raw;
  }
  return null;
}

export function saveAppModeToStorage(mode: AppMode): void {
  saveString(STORAGE_KEYS.appMode, mode);
}

export function loadConsentHistory(): ConsentRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.consentHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConsentRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveConsentHistory(records: ConsentRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.consentHistory,
      JSON.stringify(records),
    );
  } catch {
    // ignore
  }
}

/** True if any user-editable collection has been saved. */
export function hasExistingUserData(): boolean {
  if (!isBrowser()) return false;
  return [
    STORAGE_KEYS.bills,
    STORAGE_KEYS.income,
    STORAGE_KEYS.subscriptions,
    STORAGE_KEYS.alerts,
    STORAGE_KEYS.spendingLater,
    STORAGE_KEYS.manualAccounts,
  ].some((key) => window.localStorage.getItem(key) !== null);
}

/** Remove all MoneyOS data collections (not app config). */
export function clearAllCollections(): void {
  if (!isBrowser()) return;
  [
    STORAGE_KEYS.bills,
    STORAGE_KEYS.income,
    STORAGE_KEYS.subscriptions,
    STORAGE_KEYS.alerts,
    STORAGE_KEYS.spendingLater,
    STORAGE_KEYS.manualAccounts,
  ].forEach((key) => window.localStorage.removeItem(key));
}

/** Remove everything including mode and onboarding flags. */
export function clearAllMoneyOSData(): void {
  if (!isBrowser()) return;
  Object.values(STORAGE_KEYS).forEach((key) =>
    window.localStorage.removeItem(key),
  );
}

/** Generate a stable-enough unique id for a new record. */
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}
