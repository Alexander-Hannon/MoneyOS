import type { Bill, IncomeSource, Subscription } from "@/types/money";
import type { MoneyTransaction } from "@/types/transactions";
import { expectedMonthlyIncome } from "@/lib/money-utils";
import {
  approvedSubscriptionsMonthlyTotal,
  confirmedBillsMonthlyTotal,
  roundToCents,
} from "@/lib/recurring-obligations";
import { resolveAsOfDate, toYMD } from "@/lib/recurrence";

/*
 * Flex Spending Plan: fixed costs come from confirmed bills and approved
 * subscriptions; what remains after a savings target is a single flexible
 * pool for everyday spending. Actuals come only from real transactions.
 * The plan never creates bills, subscriptions, or category rules.
 */

export type SpendingPlanSettings = {
  /** Monthly amount set aside before flexible spending. */
  savingsTarget: number;
  /** Optional per-category monthly caps the user chose. */
  categoryCaps: Record<string, number>;
};

export const DEFAULT_PLAN_SETTINGS: SpendingPlanSettings = {
  savingsTarget: 0,
  categoryCaps: {},
};

export type PlanCategory = {
  category: string;
  spent: number;
  lastMonth: number;
  cap: number | null;
  count: number;
};

export type PacePoint = {
  day: number;
  date: string;
  /** Cumulative actual flex spending through this day; null after today. */
  actual: number | null;
  /** Even-pace budget line through this day. */
  pace: number;
};

export type SpendingPlan = {
  month: string;
  daysInMonth: number;
  dayOfMonth: number;
  daysLeft: number;
  expectedIncome: number;
  receivedIncome: number;
  fixedBills: number;
  fixedSubscriptions: number;
  fixedTotal: number;
  savingsTarget: number;
  flexBudget: number;
  flexSpent: number;
  flexRemaining: number;
  /** Even-pace amount that "should" be spent by end of today. */
  paceByToday: number;
  /** Positive = spending ahead of pace (over), negative = under pace. */
  paceDelta: number;
  dailyAllowance: number;
  /** Linear run-rate projection to month end. Only meaningful mid-month. */
  projectedMonthSpend: number;
  categories: PlanCategory[];
  unreviewed: { count: number; total: number };
  /** Bill-category payments not linked to a bill; excluded to avoid double counting. */
  unlinkedBillPayments: { count: number; total: number };
  pace: PacePoint[];
};

function monthKey(d: Date): string {
  return toYMD(d).slice(0, 7);
}

function previousMonthKey(d: Date): string {
  return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

/** Bill payments not yet linked to a bill — already covered by fixed costs. */
export function isUnlinkedBillPayment(t: MoneyTransaction): boolean {
  return (
    t.classification === "spending" &&
    t.amount < 0 &&
    !t.linkedBillId &&
    !t.linkedSubscriptionId &&
    (t.userConfirmedCategory || t.category) === "Bills"
  );
}

/** Spending that belongs to the flexible pool (not already fixed or moved). */
export function isFlexSpending(t: MoneyTransaction): boolean {
  if (t.classification !== "spending") return false;
  if (t.isTransferInternal) return false;
  if (t.linkedBillId || t.linkedSubscriptionId) return false;
  if (isUnlinkedBillPayment(t)) return false;
  return t.amount < 0;
}

function categoryOf(t: MoneyTransaction): string {
  return t.userConfirmedCategory || t.category || "Uncategorized";
}

export function computeSpendingPlan(args: {
  income: IncomeSource[];
  bills: Bill[];
  subscriptions: Subscription[];
  transactions: MoneyTransaction[];
  settings: SpendingPlanSettings;
  asOf?: Date | string;
}): SpendingPlan {
  const today = resolveAsOfDate(args.asOf);
  const month = monthKey(today);
  const lastMonth = previousMonthKey(today);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = daysInMonth - dayOfMonth + 1;

  const expectedIncome = roundToCents(expectedMonthlyIncome(args.income));
  const fixedBills = roundToCents(confirmedBillsMonthlyTotal(args.bills));
  const fixedSubscriptions = roundToCents(approvedSubscriptionsMonthlyTotal(args.subscriptions));
  const fixedTotal = roundToCents(fixedBills + fixedSubscriptions);
  const savingsTarget = Math.max(0, args.settings.savingsTarget || 0);
  const flexBudget = roundToCents(expectedIncome - fixedTotal - savingsTarget);

  const byCategory = new Map<string, { spent: number; lastMonth: number; count: number }>();
  const dailySpend = new Array<number>(daysInMonth + 1).fill(0);
  let flexSpent = 0;
  let receivedIncome = 0;
  const unreviewed = { count: 0, total: 0 };
  const unlinkedBillPayments = { count: 0, total: 0 };
  const todayYMD = toYMD(today);

  for (const t of args.transactions) {
    const m = t.date.slice(0, 7);
    if (m !== month && m !== lastMonth) continue;
    if (m === month && t.date.slice(0, 10) > todayYMD) continue;

    if (m === month && t.classification === "income") receivedIncome += Math.abs(t.amount);
    if (m === month && t.classification === "review") {
      unreviewed.count += 1;
      unreviewed.total += Math.abs(t.amount);
    }
    if (m === month && isUnlinkedBillPayment(t)) {
      unlinkedBillPayments.count += 1;
      unlinkedBillPayments.total += Math.abs(t.amount);
    }
    if (!isFlexSpending(t)) continue;

    const cat = categoryOf(t);
    const row = byCategory.get(cat) ?? { spent: 0, lastMonth: 0, count: 0 };
    const abs = Math.abs(t.amount);
    if (m === month) {
      row.spent += abs;
      row.count += 1;
      flexSpent += abs;
      dailySpend[Number(t.date.slice(8, 10))] += abs;
    } else {
      row.lastMonth += abs;
    }
    byCategory.set(cat, row);
  }

  // Categories with a cap stay visible even before any spending.
  for (const cat of Object.keys(args.settings.categoryCaps)) {
    if (!byCategory.has(cat)) byCategory.set(cat, { spent: 0, lastMonth: 0, count: 0 });
  }

  const categories: PlanCategory[] = [...byCategory.entries()]
    .map(([category, v]) => {
      const cap = args.settings.categoryCaps[category];
      return {
        category,
        spent: roundToCents(v.spent),
        lastMonth: roundToCents(v.lastMonth),
        cap: typeof cap === "number" && cap > 0 ? cap : null,
        count: v.count,
      };
    })
    .filter((c) => c.spent > 0 || c.lastMonth > 0 || c.cap != null)
    .sort((a, b) => b.spent - a.spent || b.lastMonth - a.lastMonth || a.category.localeCompare(b.category));

  const pace: PacePoint[] = [];
  let running = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    running += dailySpend[day];
    const date = `${month}-${String(day).padStart(2, "0")}`;
    pace.push({
      day,
      date,
      actual: day <= dayOfMonth ? roundToCents(running) : null,
      pace: roundToCents((Math.max(0, flexBudget) * day) / daysInMonth),
    });
  }

  flexSpent = roundToCents(flexSpent);
  const flexRemaining = roundToCents(flexBudget - flexSpent);
  const paceByToday = roundToCents((Math.max(0, flexBudget) * dayOfMonth) / daysInMonth);

  return {
    month,
    daysInMonth,
    dayOfMonth,
    daysLeft,
    expectedIncome,
    receivedIncome: roundToCents(receivedIncome),
    fixedBills,
    fixedSubscriptions,
    fixedTotal,
    savingsTarget,
    flexBudget,
    flexSpent,
    flexRemaining,
    paceByToday,
    paceDelta: roundToCents(flexSpent - paceByToday),
    dailyAllowance: roundToCents(Math.max(0, flexRemaining) / daysLeft),
    projectedMonthSpend: roundToCents((flexSpent / dayOfMonth) * daysInMonth),
    categories,
    unreviewed: { count: unreviewed.count, total: roundToCents(unreviewed.total) },
    unlinkedBillPayments: {
      count: unlinkedBillPayments.count,
      total: roundToCents(unlinkedBillPayments.total),
    },
    pace,
  };
}

/** Validate untrusted plan settings (from storage or the API). */
export function sanitizePlanSettings(raw: unknown): SpendingPlanSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PLAN_SETTINGS };
  const r = raw as Record<string, unknown>;
  const savings = Number(r.savingsTarget);
  const caps: Record<string, number> = {};
  if (r.categoryCaps && typeof r.categoryCaps === "object") {
    for (const [k, v] of Object.entries(r.categoryCaps as Record<string, unknown>).slice(0, 50)) {
      const n = Number(v);
      if (k.length <= 80 && Number.isFinite(n) && n > 0 && n < 1e7) caps[k] = roundToCents(n);
    }
  }
  return {
    savingsTarget: Number.isFinite(savings) && savings >= 0 && savings < 1e7 ? roundToCents(savings) : 0,
    categoryCaps: caps,
  };
}
