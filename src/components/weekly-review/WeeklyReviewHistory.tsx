"use client";

import { useState } from "react";
import { Check, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyReviewRecord } from "@/types/weekly-review";
import {
  exportWeeklyReviewJson,
  exportWeeklyReviewText,
  updateWeeklyReview,
} from "@/lib/weekly-review/storage";

export function WeeklyReviewHistory({
  reviews,
  onUpdate,
}: {
  reviews: WeeklyReviewRecord[];
  onUpdate: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    reviews[0]?.id ?? null,
  );
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved weekly reviews yet. Run your first review above.
      </p>
    );
  }

  const saveNotes = (review: WeeklyReviewRecord) => {
    const notes = notesDraft[review.id] ?? review.userNotes ?? "";
    updateWeeklyReview(review.id, { userNotes: notes });
    onUpdate();
  };

  const toggleAction = (review: WeeklyReviewRecord, action: string) => {
    const completed = new Set(review.completedActions ?? []);
    if (completed.has(action)) completed.delete(action);
    else completed.add(action);
    updateWeeklyReview(review.id, {
      completedActions: Array.from(completed),
    });
    onUpdate();
  };

  const download = (review: WeeklyReviewRecord, format: "json" | "text") => {
    const content =
      format === "json"
        ? exportWeeklyReviewJson(review)
        : exportWeeklyReviewText(review);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneyos-weekly-review-${review.weekStartDate}.${format === "json" ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const open = expandedId === review.id;
        const completed = new Set(review.completedActions ?? []);
        return (
          <div
            key={review.id}
            className="rounded-[var(--radius)] border border-border bg-card p-4"
          >
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 text-left"
              onClick={() => setExpandedId(open ? null : review.id)}
            >
              <div>
                <p className="text-sm font-medium">
                  Week of {review.weekStartDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  {review.status} · Score {review.weeklyScore}/100 ·{" "}
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {open ? "Hide" : "View"}
              </span>
            </button>

            {open && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">{review.summary}</p>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    First 3 actions
                  </p>
                  <ul className="space-y-2">
                    {review.firstThreeActions.map((action) => (
                      <li key={action} className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAction(review, action)}
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                            completed.has(action)
                              ? "border-success bg-success/15 text-success"
                              : "border-border"
                          }`}
                          aria-label="Mark action complete"
                        >
                          {completed.has(action) && <Check className="size-3" />}
                        </button>
                        <span
                          className={
                            completed.has(action)
                              ? "text-sm text-muted-foreground line-through"
                              : "text-sm"
                          }
                        >
                          {action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    className="min-h-[72px] w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    value={notesDraft[review.id] ?? review.userNotes ?? ""}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [review.id]: e.target.value,
                      }))
                    }
                    placeholder="Optional review notes…"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => saveNotes(review)}
                  >
                    Save notes
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => download(review, "json")}
                  >
                    <Download className="size-3.5" /> Export JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => download(review, "text")}
                  >
                    <FileText className="size-3.5" /> Export text
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
