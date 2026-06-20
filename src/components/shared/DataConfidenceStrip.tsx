"use client";

import { useFinancialData } from "@/hooks/useFinancialData";
import { DataConfidenceBadge } from "@/components/shared/DataConfidenceBadge";
import {
  computeDataConfidence,
  dataConfidenceDomainLabels,
} from "@/lib/data-confidence";

export function DataConfidenceStrip() {
  const fd = useFinancialData();
  const detail = computeDataConfidence(fd);
  const labels = dataConfidenceDomainLabels(detail);

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <DataConfidenceBadge level={detail.level} />
      <p className="text-xs text-muted-foreground">
        Cash: {labels.cash} · Income: {labels.income} · Bills: {labels.bills}{" "}
        · Subscriptions: {labels.subscriptions} · Spending: {labels.spending}
      </p>
    </div>
  );
}
