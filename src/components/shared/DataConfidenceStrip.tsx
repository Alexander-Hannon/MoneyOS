"use client";

import { useFinancialData } from "@/hooks/useFinancialData";
import { DataConfidenceBadge } from "@/components/shared/DataConfidenceBadge";
import { computeDataConfidence } from "@/lib/data-confidence";

export function DataConfidenceStrip() {
  const fd = useFinancialData();
  const detail = computeDataConfidence(fd);

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <DataConfidenceBadge level={detail.level} />
      <p className="text-xs text-muted-foreground">
        Cash: {detail.cash} · Income: {detail.income} · Bills: {detail.bills} ·
        Subscriptions: {detail.subscriptions} · Spending: {detail.spending}
      </p>
    </div>
  );
}
