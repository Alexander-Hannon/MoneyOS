import type { WeeklyReviewRecord } from "@/types/weekly-review";
import { loadCollection, saveCollection, STORAGE_KEYS, newId } from "@/lib/storage/local-storage";

export function listWeeklyReviews(): WeeklyReviewRecord[] {
  return loadCollection<WeeklyReviewRecord>(STORAGE_KEYS.weeklyReviews, []).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

export function saveWeeklyReview(record: WeeklyReviewRecord): void {
  const existing = listWeeklyReviews();
  const withoutDup = existing.filter((r) => r.id !== record.id);
  saveCollection(STORAGE_KEYS.weeklyReviews, [record, ...withoutDup]);
}

export function updateWeeklyReview(
  id: string,
  patch: Partial<Pick<WeeklyReviewRecord, "userNotes" | "completedActions">>,
): WeeklyReviewRecord | null {
  const reviews = listWeeklyReviews();
  const index = reviews.findIndex((r) => r.id === id);
  if (index < 0) return null;
  const updated = { ...reviews[index], ...patch };
  const next = [...reviews];
  next[index] = updated;
  saveCollection(STORAGE_KEYS.weeklyReviews, next);
  return updated;
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
