import type {
  Bill,
  IncomeSource,
  PlannedExpense,
  Subscription,
} from "@/types/money";
import { parseIncomeBaseAmount } from "@/lib/money-utils";
import {
  addDaysYMD,
  getBillEffectiveDueDate,
  getUnpaidBillOccurrencesInRange,
  getUnreceivedIncomeOccurrencesInRange,
  getUnrenewedSubscriptionOccurrencesInRange,
  resolveAsOfDate,
  toYMD,
} from "@/lib/recurrence";
import { roundToCents } from "@/lib/recurring-obligations";

/*
 * Cashflow Runway — a deterministic, day-by-day PROJECTION of cash from the
 * user's confirmed bills, approved subscriptions, active income, and planned
 * spending. It never reads or invents historical values; every point after
 * today is a projection and must be labeled "Projected" in the UI.
 */

/** How far back an unpaid, non-autopay bill is still counted (as due today). */
export const RUNWAY_OVERDUE_LOOKBACK_DAYS = 7;

export type RunwayEventKind = "bill" | "subscription" | "income" | "planned";

export type RunwayEvent = {
  id: string;
  sourceId: string;
  kind: RunwayEventKind;
  /** YYYY-MM-DD the event lands in the projection. */
  date: string;
  /** Original occurrence date (differs from `date` for overdue bills). */
  occurrenceDate: string;
  label: string;
  /** Signed: positive = inflow, negative = outflow. */
  amount: number;
  overdue?: boolean;
  reliability?: IncomeSource["reliability"];
};

export type RunwayDay = {
  date: string;
  /** Projected end-of-day balance. */
  balance: number;
  inflow: number;
  outflow: number;
  events: RunwayEvent[];
};

export type RunwayExclusion = {
  sourceId: string;
  kind: RunwayEventKind;
  label: string;
  reason: string;
};

export type RunwayResult = {
  startDate: string;
  endDate: string;
  horizonDays: number;
  startingBalance: number;
  buffer: number;
  days: RunwayDay[];
  events: RunwayEvent[];
  lowest: { date: string; balance: number };
  endingBalance: number;
  /** First day the projected balance drops below the buffer, if any. */
  firstBelowBufferDate: string | null;
  /** First day the projected balance drops below $0, if any. */
  firstNegativeDate: string | null;
  /**
   * Amount that could be spent today while every projected day in the horizon
   * stays at or above the buffer. Never negative.
   */
  safeToSpendToday: number;
  nextIncome: { date: string; amount: number; label: string } | null;
  totals: { inflow: number; outflow: number };
  exclusions: RunwayExclusion[];
};

export type RunwayInput = {
  startingBalance: number;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  plannedExpenses?: PlannedExpense[];
  horizonDays?: number;
  buffer?: number;
  asOf?: Date | string;
};

const PLANNED_ACTIVE_STATUSES = new Set<PlannedExpense["status"]>([
  "planned",
  "saving",
  "scheduled",
]);

const KIND_ORDER: Record<RunwayEventKind, number> = {
  income: 0,
  bill: 1,
  subscription: 2,
  planned: 3,
};

function billEvents(
  bills: Bill[],
  today: string,
  end: string,
  asOf: RunwayInput["asOf"],
  exclusions: RunwayExclusion[],
): RunwayEvent[] {
  const events: RunwayEvent[] = [];
  const overdueStart = addDaysYMD(today, -RUNWAY_OVERDUE_LOOKBACK_DAYS);
  const yesterday = addDaysYMD(today, -1);

  for (const bill of bills) {
    if (bill.status === "review") {
      exclusions.push({
        sourceId: bill.id,
        kind: "bill",
        label: bill.name,
        reason: "Bill is in review",
      });
      continue;
    }
    if (bill.amount == null || !Number.isFinite(bill.amount)) {
      exclusions.push({
        sourceId: bill.id,
        kind: "bill",
        label: bill.name,
        reason: "Amount unknown",
      });
      continue;
    }
    const amount = Math.abs(bill.amount);

    for (const occ of getUnpaidBillOccurrencesInRange(bill, overdueStart, yesterday, asOf)) {
      const scheduled =
        bill.status === "scheduled" &&
        (bill.scheduledForDate?.slice(0, 10) ?? getBillEffectiveDueDate(bill)) === occ;
      if (bill.autopay || scheduled) {
        exclusions.push({
          sourceId: bill.id,
          kind: "bill",
          label: bill.name,
          reason: bill.autopay
            ? "Past autopay occurrence assumed already drafted"
            : "Past scheduled payment assumed already sent — verify",
        });
        continue;
      }
      events.push({
        id: `bill:${bill.id}:${occ}`,
        sourceId: bill.id,
        kind: "bill",
        date: today,
        occurrenceDate: occ,
        label: bill.name,
        amount: -amount,
        overdue: true,
      });
    }

    for (const occ of getUnpaidBillOccurrencesInRange(bill, today, end, asOf)) {
      events.push({
        id: `bill:${bill.id}:${occ}`,
        sourceId: bill.id,
        kind: "bill",
        date: occ,
        occurrenceDate: occ,
        label: bill.name,
        amount: -amount,
      });
    }
  }
  return events;
}

function subscriptionEvents(
  subscriptions: Subscription[],
  today: string,
  end: string,
  asOf: RunwayInput["asOf"],
  exclusions: RunwayExclusion[],
): RunwayEvent[] {
  const events: RunwayEvent[] = [];
  for (const sub of subscriptions) {
    if (sub.status !== "keep") {
      exclusions.push({
        sourceId: sub.id,
        kind: "subscription",
        label: sub.name,
        reason:
          sub.status === "cancel"
            ? "Marked to cancel"
            : "Under review — not yet approved",
      });
      continue;
    }
    for (const occ of getUnrenewedSubscriptionOccurrencesInRange(sub, today, end, asOf)) {
      events.push({
        id: `sub:${sub.id}:${occ}`,
        sourceId: sub.id,
        kind: "subscription",
        date: occ,
        occurrenceDate: occ,
        label: sub.name,
        amount: -Math.abs(sub.amount),
      });
    }
  }
  return events;
}

function incomeEvents(
  income: IncomeSource[],
  today: string,
  end: string,
  asOf: RunwayInput["asOf"],
  exclusions: RunwayExclusion[],
): RunwayEvent[] {
  const events: RunwayEvent[] = [];
  for (const src of income) {
    if (!src.active) continue;
    const base = parseIncomeBaseAmount(src.expectedAmount, src.amountType, src.notes);
    if (base == null) {
      exclusions.push({
        sourceId: src.id,
        kind: "income",
        label: src.source,
        reason: "Amount unknown",
      });
      continue;
    }
    if ((src.amountType === "variable" || src.reliability === "variable") && !src.nextDate) {
      exclusions.push({
        sourceId: src.id,
        kind: "income",
        label: src.source,
        reason: "Variable income without a next expected date",
      });
      continue;
    }
    for (const occ of getUnreceivedIncomeOccurrencesInRange(src, today, end, asOf)) {
      events.push({
        id: `income:${src.id}:${occ}`,
        sourceId: src.id,
        kind: "income",
        date: occ,
        occurrenceDate: occ,
        label: src.source,
        amount: Math.abs(base),
        reliability: src.reliability,
      });
    }
  }
  return events;
}

function plannedEvents(
  planned: PlannedExpense[],
  today: string,
  end: string,
): RunwayEvent[] {
  const events: RunwayEvent[] = [];
  for (const item of planned) {
    if (!PLANNED_ACTIVE_STATUSES.has(item.status)) continue;
    if (item.amount == null || !item.targetDate) continue;
    const date = item.targetDate.slice(0, 10);
    if (date < today || date > end) continue;
    events.push({
      id: `planned:${item.id}:${date}`,
      sourceId: item.id,
      kind: "planned",
      date,
      occurrenceDate: date,
      label: item.title ?? item.name,
      amount: -Math.abs(item.amount),
    });
  }
  return events;
}

export function computeRunway(input: RunwayInput): RunwayResult {
  const horizonDays = Math.max(1, Math.round(input.horizonDays ?? 30));
  const buffer = Math.max(0, input.buffer ?? 0);
  const today = toYMD(resolveAsOfDate(input.asOf));
  const end = addDaysYMD(today, horizonDays - 1);
  const startingBalance = roundToCents(input.startingBalance);
  const exclusions: RunwayExclusion[] = [];

  const events = [
    ...incomeEvents(input.income, today, end, input.asOf, exclusions),
    ...billEvents(input.bills, today, end, input.asOf, exclusions),
    ...subscriptionEvents(input.subscriptions, today, end, input.asOf, exclusions),
    ...plannedEvents(input.plannedExpenses ?? [], today, end),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.label.localeCompare(b.label),
  );

  const byDate = new Map<string, RunwayEvent[]>();
  for (const e of events) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const days: RunwayDay[] = [];
  let balance = startingBalance;
  let inflowTotal = 0;
  let outflowTotal = 0;
  let lowest = { date: today, balance: startingBalance };
  let firstBelowBufferDate: string | null = null;
  let firstNegativeDate: string | null = null;

  for (let i = 0; i < horizonDays; i++) {
    const date = addDaysYMD(today, i);
    const dayEvents = byDate.get(date) ?? [];
    let inflow = 0;
    let outflow = 0;
    for (const e of dayEvents) {
      if (e.amount >= 0) inflow += e.amount;
      else outflow += -e.amount;
    }
    balance = roundToCents(balance + inflow - outflow);
    inflowTotal += inflow;
    outflowTotal += outflow;

    days.push({
      date,
      balance,
      inflow: roundToCents(inflow),
      outflow: roundToCents(outflow),
      events: dayEvents,
    });

    if (balance < lowest.balance) lowest = { date, balance };
    if (firstBelowBufferDate == null && balance < buffer) firstBelowBufferDate = date;
    if (firstNegativeDate == null && balance < 0) firstNegativeDate = date;
  }

  const firstIncome = events.find((e) => e.kind === "income");
  const nextIncome = firstIncome
    ? {
        date: firstIncome.date,
        label: firstIncome.label,
        amount: roundToCents(
          events
            .filter((e) => e.kind === "income" && e.date === firstIncome.date)
            .reduce((sum, e) => sum + e.amount, 0),
        ),
      }
    : null;

  return {
    startDate: today,
    endDate: end,
    horizonDays,
    startingBalance,
    buffer,
    days,
    events,
    lowest,
    endingBalance: balance,
    firstBelowBufferDate,
    firstNegativeDate,
    safeToSpendToday: roundToCents(Math.max(0, lowest.balance - buffer)),
    nextIncome,
    totals: {
      inflow: roundToCents(inflowTotal),
      outflow: roundToCents(outflowTotal),
    },
    exclusions: dedupeExclusions(exclusions),
  };
}

function dedupeExclusions(list: RunwayExclusion[]): RunwayExclusion[] {
  const seen = new Set<string>();
  return list.filter((x) => {
    const key = `${x.kind}:${x.sourceId}:${x.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type RunwayRiskLevel = "clear" | "tight" | "shortfall";

export function runwayRiskLevel(result: RunwayResult): RunwayRiskLevel {
  if (result.firstNegativeDate) return "shortfall";
  if (result.firstBelowBufferDate) return "tight";
  return "clear";
}
