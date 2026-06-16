"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Loader2,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  DataConfidenceBadge,
  StatusBadgeFromLabel,
} from "@/components/shared/DataConfidenceBadge";
import { SetupChecklistCard } from "@/components/weekly-review/SetupChecklistCard";
import { WeeklyReviewHistory } from "@/components/weekly-review/WeeklyReviewHistory";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useToast } from "@/components/ui/toast";
import { buildWeeklyReviewInput, getWeekStartDate } from "@/lib/weekly-review/build-context";
import { computeDataConfidence } from "@/lib/data-confidence";
import {
  createWeeklyReviewId,
  listWeeklyReviews,
  saveWeeklyReview,
} from "@/lib/weekly-review/storage";
import type { WeeklyReviewOutput, WeeklyReviewRecord } from "@/types/weekly-review";
import { formatCurrency } from "@/lib/money-utils";
import { AI_DISCLAIMER } from "@/lib/ai/money-agent-prompts";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function WeeklyReviewDashboard() {
  const fd = useFinancialData();
  const { status } = useUserStatus();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<WeeklyReviewOutput | null>(null);
  const [history, setHistory] = useState<WeeklyReviewRecord[]>(() =>
    listWeeklyReviews(),
  );

  const confidence = useMemo(() => computeDataConfidence(fd), [fd]);
  const input = useMemo(() => buildWeeklyReviewInput(fd), [fd]);

  const refreshHistory = useCallback(() => {
    setHistory(listWeeklyReviews());
  }, []);

  const runReview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Could not generate review.");
      }
      setReview(data as WeeklyReviewOutput);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not generate review.");
    } finally {
      setLoading(false);
    }
  };

  const saveReview = async () => {
    if (!review) return;
    const record: WeeklyReviewRecord = {
      id: createWeeklyReviewId(),
      weekStartDate: getWeekStartDate(),
      createdAt: new Date().toISOString(),
      status: review.status,
      cashAvailable: input.cashAvailable,
      billsDue7: input.billsDue7,
      billsDue14: input.billsDue14,
      billsDue30: input.billsDue30,
      incomeExpected14: input.incomeExpected14,
      monthlyRecurring: input.monthlyRecurring,
      reviewItemCount: input.reviewItemCount,
      weeklyScore: review.weeklyScore,
      summary: review.summary,
      whatMattersMost: review.whatMattersMost,
      obligationsSnapshot: review.obligationsSnapshot,
      spendingSnapshot: review.spendingSnapshot,
      risks: review.risks,
      firstThreeActions: review.firstThreeActions,
      bestNextAction: review.bestNextAction,
      sourceMode: fd.effectiveMode,
      aiProvider: review.provider,
      dataConfidence: confidence.level,
      reminderDrafts: review.reminderDrafts,
      completedActions: [],
    };

    saveWeeklyReview(record);
    refreshHistory();

    if (status.signedIn && status.databaseConfigured) {
      try {
        await fetch("/api/user/weekly-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record }),
        });
      } catch {
        // Local save succeeded — DB sync is best-effort.
      }
    }

    toast("Weekly review saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly Money Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sunday command center — status, obligations, and your first 3
            responsible actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeFromLabel status={fd.dashboardSummary.status} />
          <DataConfidenceBadge level={confidence.level} />
          <StatusBadge label={fd.modeLabel} tone="info" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Cash available"
          value={formatCurrency(fd.dashboardSummary.cashAvailable)}
        />
        <MetricCard
          label="Bills due 7d"
          value={formatCurrency(input.billsDue7)}
          hint={`${input.billsDue7Count} bill${input.billsDue7Count === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Bills due 14d"
          value={formatCurrency(input.billsDue14)}
          hint={`${input.billsDue14Count} bill${input.billsDue14Count === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Bills due 30d"
          value={formatCurrency(input.billsDue30)}
          hint={`${input.billsDue30Count} bill${input.billsDue30Count === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Income expected 14d"
          value={formatCurrency(input.incomeExpected14)}
        />
        <MetricCard
          label="Monthly recurring"
          value={formatCurrency(input.monthlyRecurring)}
        />
        <MetricCard
          label="Review items"
          value={String(input.reviewItemCount)}
        />
        <MetricCard
          label="Trials / subs to review"
          value={`${input.trialsEndingSoon} / ${input.subscriptionsNeedingReview}`}
        />
      </div>

      <SetupChecklistCard />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                Run Weekly Money Review
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Short, visual, action-oriented — {AI_DISCLAIMER}
              </p>
            </div>
            <Button
              disabled={loading}
              onClick={() => void runReview()}
              className="w-full gap-1.5 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Run Weekly Money Review
            </Button>
          </div>

          {review && (
            <div className="space-y-5 border-t border-border pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[var(--radius-md)] border border-primary/30 bg-primary/10 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                    Weekly Money Score
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {review.weeklyScore}
                    <span className="text-base font-medium text-muted-foreground">
                      /100
                    </span>
                  </p>
                </div>
                <StatusBadgeFromLabel status={review.status} />
                {review.mock && (
                  <StatusBadge label="Demo AI response" tone="info" />
                )}
              </div>

              {review.modeNotice && (
                <p className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  {review.modeNotice}
                </p>
              )}

              <Section title="What matters most" items={review.whatMattersMost} />
              <Section
                title="Bills / obligations"
                icon={CalendarClock}
                items={review.obligationsSnapshot}
              />
              <Section
                title="Spending / subscriptions"
                icon={Wallet}
                items={review.spendingSnapshot}
              />
              <Section title="Risks" items={review.risks} tone="warning" />

              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Target className="size-3.5" />
                  First 3 actions
                </p>
                <ol className="space-y-2">
                  {review.firstThreeActions.map((action, i) => (
                    <li
                      key={action}
                      className="rounded-[var(--radius-md)] border border-border bg-muted/15 px-3 py-2 text-sm"
                    >
                      <span className="mr-2 font-semibold text-primary">
                        {i + 1}.
                      </span>
                      {action}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-sm">
                  <span className="font-medium">Best next action:</span>{" "}
                  {review.bestNextAction}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reminder drafts (approval required)
                </p>
                <ul className="space-y-2">
                  {review.reminderDrafts.map((draft) => (
                    <li
                      key={draft.id}
                      className="rounded-[var(--radius-md)] border border-dashed border-border bg-muted/10 px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-muted-foreground">
                        {draft.channel === "calendar" ? "Calendar" : "Todoist"}{" "}
                        · {draft.label}
                      </p>
                      <p className="mt-0.5">{draft.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={() => void saveReview()} className="w-full sm:w-auto">
                Save review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-sm font-medium">Past weekly reviews</h2>
          <WeeklyReviewHistory reviews={history} onUpdate={refreshHistory} />
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon?: typeof CalendarClock;
  tone?: "warning";
}) {
  return (
    <div>
      <p
        className={`mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${
          tone === "warning" ? "text-warning" : "text-muted-foreground"
        }`}
      >
        {Icon && <Icon className="size-3.5" />}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
