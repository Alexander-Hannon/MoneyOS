/** Account-synced UI decisions. Validated on both client and server. */
export type UserPreferences = {
  dismissedRecurringIds: string[];
  dismissedActionIds: string[];
};

export const EMPTY_PREFERENCES: UserPreferences = {
  dismissedRecurringIds: [],
  dismissedActionIds: [],
};

const MAX_IDS = 1000;

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length <= 200))].slice(-MAX_IDS);
}

export function sanitizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PREFERENCES };
  const r = raw as Record<string, unknown>;
  return {
    dismissedRecurringIds: cleanIds(r.dismissedRecurringIds),
    dismissedActionIds: cleanIds(r.dismissedActionIds),
  };
}
