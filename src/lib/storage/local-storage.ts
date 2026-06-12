// Thin, framework-agnostic localStorage layer. Safe to import on the server
// (every function no-ops when `window` is undefined).

export const STORAGE_KEYS = {
  bills: "moneyos:bills",
  income: "moneyos:income",
  subscriptions: "moneyos:subscriptions",
  alerts: "moneyos:alerts",
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

/** Remove all MoneyOS data so defaults are loaded again. */
export function clearAllCollections(): void {
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
