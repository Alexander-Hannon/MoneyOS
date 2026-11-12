"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useMoneyData } from "@/lib/storage/store";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Reloads account data from the server (canonical) plus linked-bank data. */
export function RefreshMoneyOSDataButton({ className }: { className?: string }) {
  const money = useMoneyData();
  const fd = useFinancialData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (money.dataMode !== "account") return null;

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await Promise.all([money.reload(), fd.refreshData()]);
      toast("Data reloaded");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleRefresh()}
      disabled={busy || money.saving}
      aria-label="Reload data"
      title={money.saving ? "Saving changes…" : "Reload data"}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        className,
      )}
    >
      <RefreshCw className={cn("size-3.5", (busy || money.saving) && "animate-spin")} />
    </button>
  );
}
