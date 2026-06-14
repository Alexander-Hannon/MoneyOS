"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatLastSync, plaidStatusLabel } from "@/lib/data-source";

export function PlaidStatusCard() {
  const fd = useFinancialData();

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-5">
      <p className="text-sm font-semibold">Connection status</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Primary controls are in the header (top-right). This panel mirrors status.
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Plaid configured</dt>
          <dd className="font-medium">{fd.configured ? "Yes" : "No"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Connection</dt>
          <dd className="font-medium">
            {plaidStatusLabel(fd.plaidConnectionStatus)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Data source</dt>
          <dd className="font-medium">{fd.dataSourceBadge}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Last sync</dt>
          <dd className="font-medium">{formatLastSync(fd.lastSyncAt)}</dd>
        </div>
        {fd.plaidConnected && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Accounts</dt>
            <dd className="font-medium">{fd.linkedAccounts.length}</dd>
          </div>
        )}
      </dl>

      {fd.error && (
        <p className="mt-3 text-xs text-destructive">{fd.error}</p>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="mt-4 gap-1.5"
        disabled={!fd.plaidConnected || fd.busy}
        onClick={() => void fd.syncTransactions()}
      >
        <RefreshCw className="size-3.5" />
        Sync transactions
      </Button>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Sandbox data — not live bank data
      </p>
    </div>
  );
}
