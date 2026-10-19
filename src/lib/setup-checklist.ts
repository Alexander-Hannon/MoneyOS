import type { FinancialDataContextValue } from "@/context/FinancialDataProvider";
import { loadBoolean, STORAGE_KEYS } from "@/lib/storage/local-storage";
import { listWeeklyReviews } from "@/lib/weekly-review/storage";

export type SetupChecklistItem = {
  id: string;
  label: string;
  href: string;
  complete: boolean;
  optional?: boolean;
};

export type SetupChecklistState = {
  items: SetupChecklistItem[];
  completeCount: number;
  totalCount: number;
  percentComplete: number;
  readyForWeeklyUse: boolean;
};

const SKIPPED_KEYS = {
  bills: STORAGE_KEYS.setupSkippedBills,
  subscriptions: STORAGE_KEYS.setupSkippedSubscriptions,
} as const;

export function markSetupSkipped(key: "bills" | "subscriptions") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SKIPPED_KEYS[key], "true");
}

export function isSetupSkipped(key: "bills" | "subscriptions"): boolean {
  return loadBoolean(SKIPPED_KEYS[key]);
}

export function computeSetupChecklist(
  fd: FinancialDataContextValue,
): SetupChecklistState {
  const hasCash =
    fd.accounts.some((a) =>
      ["checking", "savings", "cash"].includes(a.type),
    ) || fd.plaidConnected;
  const hasIncome = fd.income.some((i) => i.active);
  const hasBills = fd.bills.length > 0 || isSetupSkipped("bills");
  const hasSubscriptions =
    fd.subscriptions.length > 0 || isSetupSkipped("subscriptions");
  const hasSpendingLater = fd.spendingLater.length > 0;
  const hasSandbox = fd.plaidConnected;
  const hasWeeklyReview = listWeeklyReviews().length > 0;

  const items: SetupChecklistItem[] = [
    {
      id: "accounts",
      label: "Add cash/checking/savings accounts",
      href: "/#accounts",
      complete: hasCash,
    },
    {
      id: "income",
      label: "Add income sources",
      href: "/income",
      complete: hasIncome,
    },
    {
      id: "bills",
      label: "Add bills",
      href: "/bills",
      complete: hasBills,
    },
    {
      id: "subscriptions",
      label: "Add subscriptions/trials",
      href: "/subscriptions",
      complete: hasSubscriptions,
    },
    {
      id: "spending_later",
      label: "Add spending later items",
      href: "/spending-later",
      complete: hasSpendingLater,
      optional: true,
    },
    {
      id: "sandbox",
      label: "Connect sandbox bank (optional)",
      href: "/spending",
      complete: hasSandbox,
      optional: true,
    },
    {
      id: "weekly_review",
      label: "Run first weekly review",
      href: "/weekly-review",
      complete: hasWeeklyReview,
    },
  ];

  const coreItems = items.filter((i) => !i.optional);
  const completeCount = coreItems.filter((i) => i.complete).length;
  const totalCount = coreItems.length;
  const percentComplete = totalCount
    ? Math.round((completeCount / totalCount) * 100)
    : 0;

  const readyForWeeklyUse =
    hasCash &&
    hasIncome &&
    hasBills &&
    hasSubscriptions &&
    hasWeeklyReview;

  return {
    items,
    completeCount,
    totalCount,
    percentComplete,
    readyForWeeklyUse,
  };
}
