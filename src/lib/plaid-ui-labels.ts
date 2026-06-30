import type { PlaidEnvironment } from "@/lib/plaid/plaid-env";
import type { DashboardSummary } from "@/lib/data-source";

export function isLivePlaidEnvironment(
  environment: PlaidEnvironment | null | undefined,
): boolean {
  return environment === "production";
}

export function institutionEnvironmentLabel(args: {
  environment?: PlaidEnvironment | null;
  source?: "plaid_live" | "plaid_sandbox";
}): string {
  if (
    args.environment === "production" ||
    args.source === "plaid_live"
  ) {
    return "Personal Live";
  }
  return "Plaid Sandbox";
}

export function plaidDataDisclaimer(
  environment: PlaidEnvironment | null | undefined,
): string {
  return isLivePlaidEnvironment(environment)
    ? "Personal live data — real bank data"
    : "Sandbox data — not live bank data";
}

export function transactionReviewLabel(
  environment: PlaidEnvironment | null | undefined,
  count: number,
): string {
  const noun = isLivePlaidEnvironment(environment)
    ? "live transaction"
    : "sandbox transaction";
  return `${count} ${noun}${count === 1 ? "" : "s"} need classification`;
}

import { formatCurrency } from "@/lib/money-utils";

export function confirmedMonthlyObligationsHint(
  detectedCandidatesTotal: number,
): string {
  if (detectedCandidatesTotal > 0) {
    return `Bills + approved subscriptions · Detected candidates: ${formatCurrency(detectedCandidatesTotal, true)} not included`;
  }
  return "Bills + approved subscriptions";
}

export function incomeDetectedHint(args: {
  environment: PlaidEnvironment | null | undefined;
  manualSourceCount: number;
  plaidIncomeDetected: boolean;
}): string {
  const { environment, manualSourceCount, plaidIncomeDetected } = args;
  const plural = manualSourceCount === 1 ? "" : "s";
  if (plaidIncomeDetected && isLivePlaidEnvironment(environment)) {
    return `${manualSourceCount} manual source${plural} · live inflows detected`;
  }
  if (plaidIncomeDetected) {
    return `${manualSourceCount} manual source${plural} · sandbox income detected`;
  }
  return `${manualSourceCount} source${plural} expected`;
}

export function spendingTransactionsHint(
  environment: PlaidEnvironment | null | undefined,
): string {
  return isLivePlaidEnvironment(environment)
    ? "live inflows"
    : "sandbox inflows";
}

export function spendingEmptyTitle(
  environment: PlaidEnvironment | null | undefined,
): string {
  return isLivePlaidEnvironment(environment)
    ? "No live transactions yet"
    : "No sandbox transactions yet";
}

export function recurringDetectionEmptyDescription(
  environment: PlaidEnvironment | null | undefined,
  plaidConnected: boolean,
): string {
  if (plaidConnected && isLivePlaidEnvironment(environment)) {
    return "Live transaction history will surface recurring patterns here for review.";
  }
  if (plaidConnected) {
    return "Connect Plaid sandbox or load demo data to see suggestions from transactions.";
  }
  return "Connect a bank or load demo data to see suggestions from transactions.";
}

export function cashAvailableHint(args: {
  accessibleCount: number;
  cashDataSource: DashboardSummary["cashDataSource"];
  plaidConnected: boolean;
  hasDepositoryAccounts: boolean;
}): string {
  if (
    args.plaidConnected &&
    args.cashDataSource === "plaid_live" &&
    !args.hasDepositoryAccounts
  ) {
    return "No checking/savings accounts found in connected live data.";
  }
  if (args.accessibleCount === 0) {
    return "No cash accounts added yet.";
  }
  return `${args.accessibleCount} accessible account${args.accessibleCount === 1 ? "" : "s"}`;
}

export function reviewItemsBadgeLabel(args: {
  plaidConnected: boolean;
  environment: PlaidEnvironment | null | undefined;
  dataLabel?: string;
  manualBadge: string;
}): string {
  if (!args.plaidConnected) return args.manualBadge;
  if (isLivePlaidEnvironment(args.environment)) {
    return args.dataLabel ?? "Live transactions";
  }
  return args.dataLabel ?? "Plaid Sandbox";
}
