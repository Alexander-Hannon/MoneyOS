"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { DetectedRecurringItems } from "@/components/dashboard/DetectedRecurringItems";

function SubscriptionsPageContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  useEffect(() => {
    if (filter === "detected") {
      document
        .getElementById("subscriptions-recurring-detected")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [filter]);

  const filterLabel =
    filter === "detected"
      ? "Detected recurring candidates"
      : filter === "review"
        ? "Subscriptions marked for review"
        : filter === "trial"
          ? "Trials ending soon"
          : null;

  return (
    <div className="space-y-6">
      {filterLabel ? (
        <div className="rounded-[var(--radius-md)] border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          <span className="font-medium">Filter: {filterLabel}</span>
        </div>
      ) : null}
      {filter === "detected" ? (
        <section id="subscriptions-recurring-detected" className="scroll-mt-24">
          <DetectedRecurringItems />
        </section>
      ) : null}
      <section id="subscriptions-watchlist" className="scroll-mt-24">
        <SubscriptionWatchlist
          statusFilter={
            filter === "review"
              ? "review"
              : filter === "trial"
                ? "trial"
                : null
          }
        />
      </section>
      {filter !== "detected" ? (
        <section id="subscriptions-recurring-detected" className="scroll-mt-24">
          <DetectedRecurringItems />
        </section>
      ) : null}
    </div>
  );
}

export function SubscriptionsPageClient() {
  return (
    <TaskPageShell
      title="Subscriptions"
      description="Recurring services and detected charge patterns"
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading subscriptions…</p>
        }
      >
        <SubscriptionsPageContent />
      </Suspense>
    </TaskPageShell>
  );
}
