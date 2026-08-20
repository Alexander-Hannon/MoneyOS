import type { Bill, BillFrequency, IncomeFrequency, IncomeSource, Subscription } from "@/types/money";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** How far back to look for overdue bill occurrences in dashboard display. */
export const BILL_OVERDUE_LOOKBACK_DAYS = 90;
/** How far back to count overdue bills for dashboard status. */
export const BILL_OVERDUE_COUNT_LOOKBACK_DAYS = 90;

/* ------------------------------------------------------------------ */
/* Date primitives (local calendar dates as YYYY-MM-DD)               */
/* ------------------------------------------------------------------ */

export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYMD(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

export function resolveAsOfDate(asOf?: Date | string): Date {
  if (!asOf) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  if (typeof asOf === "string") return parseYMD(asOf);
  const d = new Date(asOf);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysBetween(startYMD: string, endYMD: string): number {
  const start = parseYMD(startYMD);
  const end = parseYMD(endYMD);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function addDaysYMD(ymd: string, days: number): string {
  const d = parseYMD(ymd);
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

/** Final valid day for a calendar month (handles leap years). */
export function clampDayInMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, lastDay);
}

export function getDayOfMonthFromYMD(ymd: string): number {
  return parseYMD(ymd).getDate();
}

export function getMonthYearFromYMD(ymd: string): { month: number; year: number } {
  const d = parseYMD(ymd);
  return { month: d.getMonth(), year: d.getFullYear() };
}

/** Occurrence on a specific month/year, preserving anchor day-of-month. */
export function monthlyOccurrenceYMD(
  anchorYMD: string,
  year: number,
  monthIndex: number,
): string {
  const anchorDay = getDayOfMonthFromYMD(anchorYMD);
  const day = clampDayInMonth(year, monthIndex, anchorDay);
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function compareYMD(a: string, b: string): number {
  return a.localeCompare(b);
}

function isInRangeYMD(date: string, start: string, end: string): boolean {
  return compareYMD(date, start) >= 0 && compareYMD(date, end) <= 0;
}

function uniqueSorted(dates: string[]): string[] {
  return [...new Set(dates)].sort(compareYMD);
}

/* ------------------------------------------------------------------ */
/* Core recurrence engine                                              */
/* ------------------------------------------------------------------ */

export type RecurrenceKind =
  | BillFrequency
  | IncomeFrequency
  | "weekly"
  | "biweekly"
  | "monthly"
  | "semester"
  | "annual"
  | "one-time"
  | "variable"
  | "as-needed";

function intervalDaysForFrequency(frequency: string): number | null {
  switch (frequency) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    default:
      return null;
  }
}

function monthsStepForFrequency(frequency: string): number | null {
  switch (frequency) {
    case "monthly":
    case "variable":
      return 1;
    case "semester":
      return 3;
    case "annual":
      return 12;
    default:
      return null;
  }
}

export function isRecurringFrequency(frequency: string): boolean {
  return frequency !== "one-time" && frequency !== "as-needed";
}

/** All occurrence dates within [rangeStart, rangeEnd] inclusive. */
export function getOccurrencesInRange(args: {
  frequency: string;
  anchorDate: string;
  rangeStart: string;
  rangeEnd: string;
  recurrenceEndDate?: string;
}): string[] {
  const { frequency, anchorDate, rangeStart, rangeEnd, recurrenceEndDate } = args;
  const anchor = anchorDate.slice(0, 10);
  const start = rangeStart.slice(0, 10);
  const end = rangeEnd.slice(0, 10);
  const recurrenceEnd = recurrenceEndDate?.slice(0, 10);

  if (!anchor) return [];

  if (frequency === "one-time" || frequency === "as-needed") {
    return isInRangeYMD(anchor, start, end) ? [anchor] : [];
  }

  const intervalDays = intervalDaysForFrequency(frequency);
  if (intervalDays != null) {
    const occurrences: string[] = [];
    let cursor = anchor;

    // Walk backward to the first occurrence on or before rangeStart.
    while (compareYMD(cursor, start) > 0) {
      const prev = addDaysYMD(cursor, -intervalDays);
      if (compareYMD(prev, anchor) < 0 && compareYMD(cursor, anchor) === 0) break;
      cursor = prev;
      if (daysBetween(anchor, cursor) > 366 * 5) break;
    }
    while (compareYMD(cursor, start) < 0) {
      cursor = addDaysYMD(cursor, intervalDays);
      if (daysBetween(anchor, cursor) > 366 * 10) break;
    }

    while (compareYMD(cursor, end) <= 0) {
      if (recurrenceEnd && compareYMD(cursor, recurrenceEnd) > 0) break;
      if (compareYMD(cursor, start) >= 0) occurrences.push(cursor);
      cursor = addDaysYMD(cursor, intervalDays);
      if (occurrences.length > 400) break;
    }
    return uniqueSorted(occurrences);
  }

  const monthStep = monthsStepForFrequency(frequency);
  if (monthStep != null) {
    const { month: anchorMonth, year: anchorYear } = getMonthYearFromYMD(anchor);
    const occurrences: string[] = [];

    const rangeStartDate = parseYMD(start);
    const rangeEndDate = parseYMD(end);

    const endYear = rangeEndDate.getFullYear();
    const endMonth = rangeEndDate.getMonth();

    const anchorMonthIndex = anchorYear * 12 + anchorMonth;
    const rangeStartMonthIndex =
      rangeStartDate.getFullYear() * 12 + rangeStartDate.getMonth();
    let cursorMonthIndex = Math.max(anchorMonthIndex, rangeStartMonthIndex);

    const monthsSinceAnchor = cursorMonthIndex - anchorMonthIndex;
    if (monthsSinceAnchor % monthStep !== 0) {
      cursorMonthIndex += monthStep - (monthsSinceAnchor % monthStep);
    }

    const endMonthIndex = endYear * 12 + endMonth;

    while (cursorMonthIndex <= endMonthIndex + monthStep) {
      const y = Math.floor(cursorMonthIndex / 12);
      const m = cursorMonthIndex % 12;
      const occurrence = monthlyOccurrenceYMD(anchor, y, m);

      if (compareYMD(occurrence, anchor) >= 0) {
        if (recurrenceEnd && compareYMD(occurrence, recurrenceEnd) > 0) break;
        if (isInRangeYMD(occurrence, start, end)) {
          occurrences.push(occurrence);
        }
      }

      cursorMonthIndex += monthStep;
      if (occurrences.length > 400) break;
    }

    return uniqueSorted(occurrences);
  }

  return [];
}

/** Next occurrence on or after `onOrAfterYMD`, or undefined if none. */
export function getNextOccurrenceOnOrAfter(args: {
  frequency: string;
  anchorDate: string;
  onOrAfterYMD: string;
  recurrenceEndDate?: string;
}): string | undefined {
  const { frequency, anchorDate, onOrAfterYMD, recurrenceEndDate } = args;
  const horizon = addDaysYMD(onOrAfterYMD, 366 * 3);
  const occurrences = getOccurrencesInRange({
    frequency,
    anchorDate,
    rangeStart: onOrAfterYMD,
    rangeEnd: horizon,
    recurrenceEndDate,
  });
  return occurrences.find((d) => compareYMD(d, onOrAfterYMD) >= 0);
}

/* ------------------------------------------------------------------ */
/* Bill helpers                                                        */
/* ------------------------------------------------------------------ */

export function isRecurringBill(bill: Bill): boolean {
  return bill.frequency !== "one-time";
}

export function getBillAnchorDate(bill: Bill): string {
  return bill.dueDate.slice(0, 10);
}

/** Whether a specific occurrence has been paid. */
export function isBillOccurrencePaid(bill: Bill, occurrenceYMD: string): boolean {
  const occurrence = occurrenceYMD.slice(0, 10);

  if (!isRecurringBill(bill)) {
    return (
      bill.status === "paid" ||
      (bill.lastPaidAt?.slice(0, 10) === occurrence)
    );
  }

  if (bill.lastPaidAt && bill.lastPaidAt.slice(0, 10) === occurrence) {
    return true;
  }

  // Backward compatibility: paid status without lastPaidAt applies to anchor date only.
  if (bill.status === "paid" && !bill.lastPaidAt) {
    return occurrence === getBillAnchorDate(bill);
  }

  return false;
}

export function getBillNextDueDate(bill: Bill, asOf?: Date | string): string {
  const effective = getBillEffectiveDueDate(bill, asOf);
  if (effective) return effective;
  return getBillAnchorDate(bill);
}

/** Earliest unpaid occurrence (including overdue) within a one-year lookback/ahead window. */
export function getBillEffectiveDueDate(
  bill: Bill,
  asOf?: Date | string,
): string | undefined {
  const today = toYMD(resolveAsOfDate(asOf));
  const overdueStart = addDaysYMD(today, -BILL_OVERDUE_LOOKBACK_DAYS);
  const yesterday = addDaysYMD(today, -1);
  const lastPaid = bill.lastPaidAt?.slice(0, 10);
  const overdue = getUnpaidBillOccurrencesInRange(
    bill,
    overdueStart,
    yesterday,
    asOf,
  ).filter((occurrence) => !lastPaid || occurrence > lastPaid);
  if (overdue.length > 0) {
    return overdue[overdue.length - 1];
  }

  const horizon = addDaysYMD(today, 366);
  const upcoming = getUnpaidBillOccurrencesInRange(bill, today, horizon, asOf);
  return upcoming[0];
}

export function getBillOccurrencesInRange(
  bill: Bill,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  void asOf;
  const anchor = getBillAnchorDate(bill);
  return getOccurrencesInRange({
    frequency: bill.frequency,
    anchorDate: anchor,
    rangeStart,
    rangeEnd,
  });
}

export function getUnpaidBillOccurrencesInRange(
  bill: Bill,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  return getBillOccurrencesInRange(bill, rangeStart, rangeEnd, asOf).filter(
    (occurrence) => !isBillOccurrencePaid(bill, occurrence),
  );
}

export type BillOccurrence = {
  bill: Bill;
  occurrenceDate: string;
};

/** Bills with their next relevant unpaid occurrence in a day window. */
export function getBillsDueInDayWindow(
  bills: Bill[],
  minDays: number,
  maxDays: number,
  asOf?: Date | string,
): BillOccurrence[] {
  const today = toYMD(resolveAsOfDate(asOf));
  const rangeStart = addDaysYMD(today, minDays);
  const rangeEnd = addDaysYMD(today, maxDays);

  const results: BillOccurrence[] = [];

  for (const bill of bills) {
    const unpaid = getUnpaidBillOccurrencesInRange(bill, rangeStart, rangeEnd, asOf);
    if (unpaid.length === 0) continue;

    // Use the earliest unpaid occurrence in the window.
    results.push({ bill, occurrenceDate: unpaid[0] });
  }

  return results.sort(
    (a, b) => compareYMD(a.occurrenceDate, b.occurrenceDate),
  );
}

export function getBillsDueThisMonth(
  bills: Bill[],
  asOf?: Date | string,
): BillOccurrence[] {
  const ref = resolveAsOfDate(asOf);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const rangeStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const rangeEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const results: BillOccurrence[] = [];

  for (const bill of bills) {
    const unpaid = getUnpaidBillOccurrencesInRange(bill, rangeStart, rangeEnd, asOf);
    if (unpaid.length === 0) continue;
    for (const occurrenceDate of unpaid) {
      results.push({ bill, occurrenceDate });
    }
  }

  return results.sort(
    (a, b) => compareYMD(a.occurrenceDate, b.occurrenceDate),
  );
}

/* ------------------------------------------------------------------ */
/* Income helpers                                                      */
/* ------------------------------------------------------------------ */

export function getIncomeAnchorDate(source: IncomeSource): string | undefined {
  if (source.nextDate) return source.nextDate.slice(0, 10);
  if (source.startDate) return source.startDate.slice(0, 10);
  return undefined;
}

export function inferIncomeAnchorDate(source: IncomeSource): string | undefined {
  const explicit = getIncomeAnchorDate(source);
  if (explicit) return explicit;
  if (!source.active) return undefined;

  switch (source.frequency) {
    case "weekly":
    case "biweekly":
      return toYMD(resolveAsOfDate());
    case "monthly":
      return monthlyOccurrenceYMD(
        "2000-01-01",
        resolveAsOfDate().getFullYear(),
        resolveAsOfDate().getMonth(),
      );
    default:
      return undefined;
  }
}

export function getIncomeOccurrencesInRange(
  source: IncomeSource,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  void asOf;
  if (!source.active) return [];

  const anchor = inferIncomeAnchorDate(source);
  if (!anchor) return [];

  if (source.frequency === "variable" || source.frequency === "as-needed") {
    if (!source.nextDate) return [];
    return getOccurrencesInRange({
      frequency: "one-time",
      anchorDate: source.nextDate,
      rangeStart,
      rangeEnd,
    });
  }

  return getOccurrencesInRange({
    frequency: source.frequency,
    anchorDate: anchor,
    rangeStart,
    rangeEnd,
  });
}

export function getIncomeNextDate(
  source: IncomeSource,
  asOf?: Date | string,
): string | undefined {
  const today = toYMD(resolveAsOfDate(asOf));
  const anchor = inferIncomeAnchorDate(source);
  if (!anchor || !source.active) return undefined;

  const unreceived = getUnreceivedIncomeOccurrencesInRange(
    source,
    today,
    addDaysYMD(today, 366),
    asOf,
  );
  return unreceived[0];
}

/** Whether a specific income occurrence has been received. */
export function isIncomeOccurrenceReceived(
  source: IncomeSource,
  occurrenceYMD: string,
): boolean {
  const occurrence = occurrenceYMD.slice(0, 10);
  if (source.lastReceivedAt && source.lastReceivedAt.slice(0, 10) === occurrence) {
    return true;
  }
  return false;
}

export function getUnreceivedIncomeOccurrencesInRange(
  source: IncomeSource,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  return getIncomeOccurrencesInRange(source, rangeStart, rangeEnd, asOf).filter(
    (occurrence) => !isIncomeOccurrenceReceived(source, occurrence),
  );
}

export function countExpectedIncomeOccurrences(
  source: IncomeSource,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): number {
  return getUnreceivedIncomeOccurrencesInRange(
    source,
    rangeStart,
    rangeEnd,
    asOf,
  ).length;
}

/* ------------------------------------------------------------------ */
/* Subscription helpers (shared recurrence engine)                     */
/* ------------------------------------------------------------------ */

export function getSubscriptionAnchorDate(
  subscription: Subscription,
): string | undefined {
  if (subscription.renewalDate) return subscription.renewalDate.slice(0, 10);
  return undefined;
}

export function inferSubscriptionAnchorDate(
  subscription: Subscription,
  asOf?: Date | string,
): string | undefined {
  const explicit = getSubscriptionAnchorDate(subscription);
  if (explicit) return explicit;
  if (subscription.status !== "keep") return undefined;

  const ref = resolveAsOfDate(asOf);
  switch (subscription.frequency) {
    case "weekly":
    case "monthly":
      return toYMD(ref);
    case "annual":
      return monthlyOccurrenceYMD("2000-01-01", ref.getFullYear(), ref.getMonth());
    default:
      return undefined;
  }
}

export function isSubscriptionOccurrenceRenewed(
  subscription: Subscription,
  occurrenceYMD: string,
): boolean {
  const occurrence = occurrenceYMD.slice(0, 10);
  if (
    subscription.lastRenewedAt &&
    subscription.lastRenewedAt.slice(0, 10) === occurrence
  ) {
    return true;
  }
  return false;
}

export function getSubscriptionRenewalsInRange(
  subscription: Subscription,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  if (subscription.status !== "keep") return [];

  const anchor = inferSubscriptionAnchorDate(subscription, asOf);
  if (!anchor) return [];

  if (subscription.frequency === "variable") {
    if (!subscription.renewalDate) return [];
    return getOccurrencesInRange({
      frequency: "one-time",
      anchorDate: subscription.renewalDate,
      rangeStart,
      rangeEnd,
    });
  }

  return getOccurrencesInRange({
    frequency: subscription.frequency,
    anchorDate: anchor,
    rangeStart,
    rangeEnd,
  });
}

export function getUnrenewedSubscriptionOccurrencesInRange(
  subscription: Subscription,
  rangeStart: string,
  rangeEnd: string,
  asOf?: Date | string,
): string[] {
  return getSubscriptionRenewalsInRange(
    subscription,
    rangeStart,
    rangeEnd,
    asOf,
  ).filter((occurrence) => !isSubscriptionOccurrenceRenewed(subscription, occurrence));
}

export function getSubscriptionNextRenewalDate(
  subscription: Subscription,
  asOf?: Date | string,
): string | undefined {
  if (subscription.status !== "keep") return undefined;

  const today = toYMD(resolveAsOfDate(asOf));
  const lastRenewed = subscription.lastRenewedAt?.slice(0, 10);
  const overdueStart = addDaysYMD(today, -BILL_OVERDUE_LOOKBACK_DAYS);
  const yesterday = addDaysYMD(today, -1);
  const overdue = getUnrenewedSubscriptionOccurrencesInRange(
    subscription,
    overdueStart,
    yesterday,
    asOf,
  ).filter((occurrence) => !lastRenewed || occurrence > lastRenewed);
  if (overdue.length > 0) {
    return overdue[overdue.length - 1];
  }

  const horizon = addDaysYMD(today, 366);
  const upcoming = getUnrenewedSubscriptionOccurrencesInRange(
    subscription,
    today,
    horizon,
    asOf,
  );
  return upcoming[0];
}

export function getSubscriptionsRenewingInDayWindow(
  subscriptions: Subscription[],
  minDays: number,
  maxDays: number,
  asOf?: Date | string,
): Array<{ subscription: Subscription; occurrenceDate: string }> {
  const today = toYMD(resolveAsOfDate(asOf));
  const rangeStart = addDaysYMD(today, minDays);
  const rangeEnd = addDaysYMD(today, maxDays);
  const results: Array<{ subscription: Subscription; occurrenceDate: string }> = [];

  for (const subscription of subscriptions) {
    if (subscription.status !== "keep") continue;
    const unrenewed = getUnrenewedSubscriptionOccurrencesInRange(
      subscription,
      rangeStart,
      rangeEnd,
      asOf,
    );
    if (unrenewed.length === 0) continue;
    results.push({ subscription, occurrenceDate: unrenewed[0] });
  }

  return results.sort((a, b) => compareYMD(a.occurrenceDate, b.occurrenceDate));
}
