"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatLastSync } from "@/lib/data-source";
import { useToast } from "@/components/ui/toast";

export function RefreshLiveBalancesButton({
  plaidItemId,
  size = "sm",
  variant = "secondary",
  showQuota = true,
  className,
}: {
  plaidItemId?: string;
  size?: "sm" | "default";
  variant?: "secondary" | "ghost" | "outline";
  showQuota?: boolean;
  className?: string;
}) {
  const fd = useFinancialData();
  const toast = useToast();
  const isLive = fd.activePlaidEnvironment === "production";

  if (!isLive || !fd.liveConnected) return null;

  const quota = fd.balanceRefreshQuota;
  const disabled =
    fd.busy || (quota != null && quota.remaining <= 0);

  const handleRefresh = async () => {
    const result = await fd.refreshBalances(plaidItemId);
    toast(
      result.ok
        ? (result.message ?? "Live balances refreshed.")
        : (result.message ?? "Could not refresh live balances."),
    );
    await fd.loadBalanceRefreshQuota();
  };

  return (
    <div className={className}>
      <Button
        size={size}
        variant={variant}
        disabled={disabled}
        onClick={() => void handleRefresh()}
        className="gap-1.5"
      >
        <RefreshCw className={`size-3.5 ${fd.busy ? "animate-spin" : ""}`} />
        Refresh live balances
      </Button>
      {showQuota && (
        <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
          <p>Last refreshed: {formatLastSync(fd.lastBalanceRefreshAt)}</p>
          <p>
            {quota
              ? quota.remaining > 0
                ? `${quota.remaining} refresh${quota.remaining === 1 ? "" : "es"} remaining in current 24h window`
                : "Daily refresh limit reached"
              : "Checking refresh quota…"}
          </p>
          {quota?.nextEligibleAt && quota.remaining <= 0 ? (
            <p>Next eligible: {formatLastSync(quota.nextEligibleAt)}</p>
          ) : null}
          <p className="text-[10px]">
            Balances refresh manually to control Plaid usage.
          </p>
        </div>
      )}
    </div>
  );
}
