import type { ActionItem } from "@/types/actions";
import type { Alert } from "@/types/money";

export type ActionDestinationKey =
  | "classify_transactions"
  | "recurring_candidates"
  | "recurring_obligations"
  | "cash_available"
  | "review_items"
  | "bills_due"
  | "income_review"
  | "spending_later"
  | "setup_accounts"
  | "subscriptions_review"
  | "subscriptions_trial"
  | "pay_bill"
  | "alerts"
  | "ai_recommendation"
  | "accounts";

export type ActionDestination = {
  path: string;
  query?: Record<string, string>;
  hash?: string;
};

export const ACTION_DESTINATIONS: Record<
  ActionDestinationKey,
  ActionDestination
> = {
  classify_transactions: {
    path: "/spending",
    query: { filter: "needs-classification" },
  },
  recurring_candidates: {
    path: "/recurring",
    query: { section: "detected" },
  },
  recurring_obligations: {
    path: "/recurring",
  },
  cash_available: {
    path: "/cash",
  },
  review_items: {
    path: "/action-center",
  },
  bills_due: { path: "/bills", query: { filter: "due" } },
  income_review: { path: "/income", query: { filter: "review" } },
  spending_later: { path: "/spending-later" },
  setup_accounts: { path: "/settings", hash: "live-bank-accounts" },
  subscriptions_review: {
    path: "/subscriptions",
    query: { filter: "review" },
  },
  subscriptions_trial: {
    path: "/subscriptions",
    query: { filter: "trial" },
  },
  pay_bill: { path: "/bills", query: { filter: "due" } },
  alerts: { path: "/", hash: "alerts" },
  ai_recommendation: { path: "/", hash: "action-center" },
  /** @deprecated Use cash_available */
  accounts: { path: "/cash" },
};

export function buildDestinationUrl(dest: ActionDestination): string {
  const params = new URLSearchParams(dest.query ?? {});
  const qs = params.toString();
  const base = `${dest.path}${qs ? `?${qs}` : ""}`;
  return dest.hash ? `${base}#${dest.hash}` : base;
}

export function resolveDestinationKeyForAlert(
  alert: Alert,
): ActionDestinationKey {
  switch (alert.syncType) {
    case "transaction_needs_classification":
      return "classify_transactions";
    case "recurring_candidate_detected":
      return "recurring_candidates";
    case "bill_due_soon":
    case "bill_overdue":
    case "variable_bill_review":
    case "low_cash_coverage":
      return "bills_due";
    case "subscription_review":
      return "subscriptions_review";
    case "trial_ending":
      return "subscriptions_trial";
    case "spending_later_due":
      return "spending_later";
    case "setup_needed":
      return "setup_accounts";
    default:
      break;
  }

  const haystack = `${alert.title} ${alert.suggestedAction}`.toLowerCase();
  if (
    haystack.includes("classif") ||
    (haystack.includes("transaction") && haystack.includes("spending"))
  ) {
    return "classify_transactions";
  }
  if (haystack.includes("recurring") || haystack.includes("subscription-like")) {
    return "recurring_candidates";
  }
  if (alert.category === "bill") return "bills_due";
  if (alert.category === "subscription") return "subscriptions_review";
  if (alert.category === "spending") return "spending_later";
  if (alert.category === "account") return "cash_available";
  return "alerts";
}

export function resolveDestinationKeyForActionItem(
  item: ActionItem,
): ActionDestinationKey {
  if (item.destinationKey) return item.destinationKey;

  switch (item.type) {
    case "classify_transaction":
      return "classify_transactions";
    case "recurring_suggestion":
      return "recurring_candidates";
    case "pay_bill":
      return "pay_bill";
    case "trial_ending":
      return "subscriptions_trial";
    case "subscription_review":
      return "subscriptions_review";
    case "spending_later":
      return "spending_later";
    case "setup":
      return "setup_accounts";
    case "ai_recommendation":
      return "ai_recommendation";
    case "review_alert":
      return "review_items";
    default:
      return "alerts";
  }
}
