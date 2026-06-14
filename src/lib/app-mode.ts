import type { AppMode, ModeDisplayLabel } from "@/types/app-mode";
import type {
  Alert,
  Bill,
  IncomeSource,
  PlannedExpense,
  Subscription,
} from "@/types/money";
import {
  demoAlerts,
  demoSpendingLater,
  getDemoBills,
  getDemoIncome,
  getDemoSubscriptions,
} from "@/lib/data/demo-user-data";
import {
  emptyAlerts,
  emptySpendingLater,
  getEmptyBills,
  getEmptyIncome,
  getEmptySubscriptions,
} from "@/lib/data/empty-user-data";
import {
  hasExistingUserData,
  loadAppModeFromStorage,
  loadBoolean,
  STORAGE_KEYS,
} from "@/lib/storage/local-storage";

export type ModeDefaults = {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
};

export function getDefaultsForMode(mode: AppMode): ModeDefaults {
  if (mode === "demo") {
    return {
      bills: getDemoBills(),
      income: getDemoIncome(),
      subscriptions: getDemoSubscriptions(),
      alerts: demoAlerts,
      spendingLater: demoSpendingLater,
    };
  }
  return {
    bills: getEmptyBills(),
    income: getEmptyIncome(),
    subscriptions: getEmptySubscriptions(),
    alerts: emptyAlerts,
    spendingLater: emptySpendingLater,
  };
}

/** Stored preference, with migration for existing localStorage users. */
export function loadStoredAppMode(): AppMode {
  const stored = loadAppModeFromStorage();
  if (stored) return stored;
  if (hasExistingUserData()) return "local_user";
  return "local_user";
}

export function loadOnboardingCompleted(): boolean {
  if (loadBoolean(STORAGE_KEYS.onboardingCompleted)) return true;
  if (hasExistingUserData()) return true;
  return false;
}

/**
 * Effective mode for data labels and AI context.
 * Plaid connection elevates display to plaid_sandbox unless in pure demo manual mode.
 */
export function resolveEffectiveMode(
  storedMode: AppMode,
  plaidConnected: boolean,
): AppMode {
  if (storedMode === "future_plaid_live") return "future_plaid_live";
  if (plaidConnected) return "plaid_sandbox";
  if (storedMode === "plaid_sandbox") return "local_user";
  return storedMode;
}

export function getModeDisplayLabel(
  storedMode: AppMode,
  plaidConnected: boolean,
): ModeDisplayLabel {
  if (storedMode === "future_plaid_live") return "Live mode disabled";
  if (plaidConnected) return "Plaid Sandbox";
  if (storedMode === "demo") return "Demo Mode";
  return "Local User Data";
}

export type DataSourceLabel =
  | "Demo data"
  | "Local user data"
  | "Plaid Sandbox"
  | "Mixed demo + sandbox"
  | "Mixed local + sandbox"
  | "Empty — add your data";

export function getDataSourceLabel(
  storedMode: AppMode,
  plaidConnected: boolean,
  isEmpty: boolean,
): DataSourceLabel {
  if (plaidConnected) {
    if (storedMode === "demo") return "Mixed demo + sandbox";
    return "Mixed local + sandbox";
  }
  if (storedMode === "demo") return "Demo data";
  if (isEmpty) return "Empty — add your data";
  return "Local user data";
}

export function isManualDataEmpty(args: {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
}): boolean {
  return (
    args.bills.length === 0 &&
    args.income.length === 0 &&
    args.subscriptions.length === 0 &&
    args.alerts.length === 0
  );
}

export function canGenerateUsefulBrief(
  effectiveMode: AppMode,
  isEmpty: boolean,
  plaidConnected: boolean,
): boolean {
  if (effectiveMode === "future_plaid_live") return false;
  if (plaidConnected) return true;
  if (effectiveMode === "demo") return true;
  return !isEmpty;
}
