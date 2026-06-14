import type { MoneyBriefInput, MoneyBriefOutput } from "@/lib/ai/types";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function deriveStatusLabel(input: MoneyBriefInput): string {
  if (input.setupIncomplete) return "Setup Needed";
  if (input.billsDue14Days > input.cashAvailable + input.incomeExpected14Days) {
    return "Danger";
  }
  if (
    input.billsDue14Days >
    (input.cashAvailable + input.incomeExpected14Days) * 0.6
  ) {
    return "Tight";
  }
  if (input.reviewItemsCount > 0) return "Review Needed";
  if (input.activeAlerts.some((a) => a.severity === "high")) return "Watch";
  return "Stable";
}

export function buildSimpleBriefFields(
  input: MoneyBriefInput,
): Pick<
  MoneyBriefOutput,
  | "statusLabel"
  | "topThreeThings"
  | "mainRisk"
  | "bestNextAction"
  | "visualSnapshot"
> {
  const statusLabel = deriveStatusLabel(input);
  const topThreeThings: string[] = [];

  if (input.cashAvailable > 0) {
    topThreeThings.push(
      `You have ${formatCurrency(input.cashAvailable)} available cash.`,
    );
  }
  if (input.billsDue14Count > 0) {
    topThreeThings.push(
      `${input.billsDue14Count} bill${input.billsDue14Count === 1 ? "" : "s"} due in 14 days (${formatCurrency(input.billsDue14Days)}).`,
    );
  }
  if (input.reviewItemsCount > 0) {
    topThreeThings.push(
      `${input.reviewItemsCount} review item${input.reviewItemsCount === 1 ? "" : "s"} need a decision.`,
    );
  }
  while (topThreeThings.length < 3) {
    topThreeThings.push("Keep monitoring recurring bills and subscriptions.");
  }

  const mainRisk =
    input.billsDue14Days > input.cashAvailable
      ? `Upcoming bills exceed current cash by ${formatCurrency(input.billsDue14Days - input.cashAvailable)}.`
      : input.reviewItemsCount > 0
        ? "Uncategorized or review items may skew spending totals."
        : "No critical risk flagged — stay ahead of due dates.";

  const highAlert = input.activeAlerts.find(
    (a) => a.severity === "high" && a.reviewRequired,
  );

  return {
    statusLabel,
    topThreeThings: topThreeThings.slice(0, 3),
    mainRisk,
    bestNextAction:
      highAlert?.title ??
      (input.reviewItemsCount > 0
        ? "Review open alerts and confirm categories."
        : "Confirm upcoming bill amounts and payment sources."),
    visualSnapshot: {
      cashAvailable: input.cashAvailable,
      billsDue14: input.billsDue14Days,
      income14: input.incomeExpected14Days,
      monthlySpending: input.monthlySpending,
      reviewItemsCount: input.reviewItemsCount,
      upcomingObligationsCount: input.billsDue14Count,
    },
  };
}
