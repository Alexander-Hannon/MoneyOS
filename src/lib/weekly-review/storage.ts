import type { WeeklyReviewRecord } from "@/types/weekly-review";
import { newId } from "@/lib/storage/local-storage";

/*
 * Weekly reviews. Signed-in: the server is canonical and this module keeps an
 * in-memory copy for synchronous readers (e.g. the setup checklist).
 * Signed-out preview: reviews live in memory only and are never saved.
 */

let cache: WeeklyReviewRecord[] = [];

function sorted(records: WeeklyReviewRecord[]): WeeklyReviewRecord[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listWeeklyReviews(): WeeklyReviewRecord[] {
  return sorted(cache);
}

export async function loadWeeklyReviews(accountBacked: boolean): Promise<WeeklyReviewRecord[]> {
  if (!accountBacked) return listWeeklyReviews();
  const res = await fetch("/api/user/weekly-reviews");
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(body.reviews)) {
    throw new Error(body.message ?? body.error ?? "Could not load weekly reviews.");
  }
  cache = body.reviews as WeeklyReviewRecord[];
  return listWeeklyReviews();
}

/** Saves a review (server first when signed in) and returns the new list. */
export async function saveWeeklyReview(
  record: WeeklyReviewRecord,
  accountBacked: boolean,
): Promise<WeeklyReviewRecord[]> {
  if (accountBacked) {
    const res = await fetch("/api/user/weekly-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      throw new Error(body.error ?? body.message ?? "Could not save the weekly review.");
    }
  }
  cache = [record, ...cache.filter((r) => r.id !== record.id)];
  return listWeeklyReviews();
}

export async function updateWeeklyReview(
  id: string,
  patch: Partial<Pick<WeeklyReviewRecord, "userNotes" | "completedActions">>,
  accountBacked: boolean,
): Promise<WeeklyReviewRecord[]> {
  const current = cache.find((r) => r.id === id);
  if (!current) return listWeeklyReviews();
  return saveWeeklyReview({ ...current, ...patch }, accountBacked);
}

export function createWeeklyReviewId(): string {
  return newId("weekly-review");
}

export function exportWeeklyReviewJson(record: WeeklyReviewRecord): string {
  return JSON.stringify(record, null, 2);
}

export function exportWeeklyReviewText(record: WeeklyReviewRecord): string {
  const lines = [
    `MoneyOS Weekly Review — week of ${record.weekStartDate}`,
    `Status: ${record.status} · Score: ${record.weeklyScore}/100`,
    `Data confidence: ${record.dataConfidence} (${record.sourceMode})`,
    "",
    "Summary",
    record.summary,
    "",
    "What matters most",
    ...record.whatMattersMost.map((line) => `• ${line}`),
    "",
    "First 3 actions",
    ...record.firstThreeActions.map((line, i) => `${i + 1}. ${line}`),
    "",
    "Risks",
    ...record.risks.map((line) => `• ${line}`),
  ];
  if (record.userNotes) {
    lines.push("", "Notes", record.userNotes);
  }
  return lines.join("\n");
}
