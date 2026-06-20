"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountDataSync } from "@/context/AccountDataSyncProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { formatLastSync } from "@/lib/data-source";
import { useToast } from "@/components/ui/toast";

export function RefreshMoneyOSDataButton({
  variant = "secondary",
  className,
}: {
  variant?: "secondary" | "ghost" | "default";
  className?: string;
}) {
  const sync = useAccountDataSync();
  const fd = useFinancialData();
  const { status } = useUserStatus();
  const toast = useToast();

  if (!sync.enabled) return null;

  const handleRefresh = async () => {
    const ok = await sync.refreshAccountData();
    toast(ok ? "Account data refreshed." : "Could not refresh account data.");
  };

  return (
    <div className={className}>
      <Button
        size="sm"
        variant={variant}
        disabled={sync.busy}
        onClick={() => void handleRefresh()}
        className="gap-1.5"
      >
        <RefreshCw className={`size-3.5 ${sync.busy ? "animate-spin" : ""}`} />
        Refresh MoneyOS data
      </Button>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Last account sync:{" "}
        {formatLastSync(sync.lastAccountDataSyncAt)}
        {" · "}
        Mode: {fd.modeLabel}
        {status.signedIn ? " · Signed in" : ""}
      </p>
    </div>
  );
}
