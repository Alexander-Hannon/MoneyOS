"use client";

import { useAccountDataSync } from "@/context/AccountDataSyncProvider";
import type { DomainCounts } from "@/lib/sync/account-data-utils";

function formatCounts(counts: DomainCounts): string {
  return [
    `${counts.bills} bills`,
    `${counts.income} income`,
    `${counts.subscriptions} subscriptions`,
    `${counts.alerts} alerts`,
    `${counts.manualAccounts} manual accounts`,
    `${counts.spendingLater} planned expenses`,
    `${counts.weeklyReviews} weekly reviews`,
  ].join(" · ");
}

function formatTime(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function SyncDiagnosticsPanel() {
  const { enabled, diagnostics, syncError, lastAccountDataSyncAt } =
    useAccountDataSync();

  if (!enabled) return null;

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-muted/10 p-3">
      <div>
        <p className="text-xs font-medium">Sync diagnostics</p>
        <p className="text-[11px] text-muted-foreground">
          Read-only view of local vs account-backed sync state on this device.
        </p>
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Local counts</dt>
          <dd className="mt-1 font-medium">{formatCounts(diagnostics.localCounts)}</dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Account counts</dt>
          <dd className="mt-1 font-medium">
            {formatCounts(diagnostics.accountCounts)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Last pull</dt>
          <dd className="mt-1 font-medium">{formatTime(diagnostics.lastPullAt)}</dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Last push</dt>
          <dd className="mt-1 font-medium">{formatTime(diagnostics.lastPushAt)}</dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Last merge</dt>
          <dd className="mt-1 font-medium">{formatTime(diagnostics.lastMergeAt)}</dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
          <dt className="text-muted-foreground">Last loaded from</dt>
          <dd className="mt-1 font-medium">
            {diagnostics.lastLoadedFrom ?? "Unknown"}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2 sm:col-span-2">
          <dt className="text-muted-foreground">Last account sync</dt>
          <dd className="mt-1 font-medium">
            {formatTime(lastAccountDataSyncAt)}
          </dd>
        </div>
      </dl>
      {diagnostics.lastMergeResult ? (
        <p className="text-[11px] text-muted-foreground">
          Last merge result:{" "}
          {Object.entries(diagnostics.lastMergeResult)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")}
        </p>
      ) : null}
      {(syncError || diagnostics.lastError) && (
        <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-2 text-[11px] text-warning">
          {syncError ?? diagnostics.lastError}
        </p>
      )}
    </div>
  );
}
