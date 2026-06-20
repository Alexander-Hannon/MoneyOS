"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useToast } from "@/components/ui/toast";
import type { DuplicateRepairDryRun } from "@/lib/plaid/duplicate-repair";

export function DuplicateRepairPanel() {
  const { status } = useUserStatus();
  const fd = useFinancialData();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState<DuplicateRepairDryRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerEligible =
    status.signedIn && status.databaseConfigured && fd.liveUserAllowed;

  const loadDryRun = useCallback(async () => {
    if (!ownerEligible) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/repair-duplicates");
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message ?? "Could not analyze duplicates.");
      }
      setDryRun(data.dryRun ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze duplicates.");
      setDryRun(null);
    } finally {
      setLoading(false);
    }
  }, [ownerEligible]);

  useEffect(() => {
    if (!ownerEligible) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/repair-duplicates");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.ok === false) {
          throw new Error(data.message ?? "Could not analyze duplicates.");
        }
        setDryRun(data.dryRun ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not analyze duplicates.");
        setDryRun(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerEligible]);

  if (!ownerEligible) return null;

  const hasDuplicates =
    (dryRun?.duplicateInstitutions.length ?? 0) > 0 ||
    (dryRun?.duplicateAccounts.length ?? 0) > 0;

  const runRepair = async (deleteHistory: boolean) => {
    if (
      !window.confirm(
        "Repair duplicate live connections? This keeps the newest active connection and disconnects older duplicates. Transaction history is preserved unless you choose to delete it.",
      )
    ) {
      return;
    }

    let deleteHistoryConfirmed = false;
    if (deleteHistory) {
      deleteHistoryConfirmed = window.confirm(
        "Delete duplicate historical data for disconnected items? This permanently removes their stored accounts and transactions. This cannot be undone.",
      );
      if (!deleteHistoryConfirmed) return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/repair-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          deleteHistoryForDisconnected: deleteHistory,
          deleteHistoryConfirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message ?? "Repair failed.");
      }
      toast(data.message ?? "Duplicate repair completed.");
      await fd.refreshData();
      await loadDryRun();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Repair failed.";
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3">
      <div className="flex items-start gap-2">
        <Wrench className="mt-0.5 size-4 shrink-0 text-warning" />
        <div>
          <p className="text-xs font-medium">Repair duplicate live connections</p>
          <p className="text-[11px] text-muted-foreground">
            Owner-only dry-run and repair for duplicate production Plaid items.
            Nothing is deleted automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Analyzing duplicates…</p>
      ) : null}

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}

      {dryRun && !hasDuplicates ? (
        <p className="text-xs text-muted-foreground">
          No duplicate live institutions or accounts detected.
        </p>
      ) : null}

      {dryRun && hasDuplicates ? (
        <div className="space-y-3 text-xs">
          {dryRun.duplicateInstitutions.map((group) => (
            <div
              key={group.institutionKey}
              className="rounded-[var(--radius-md)] border border-border bg-background/40 p-2"
            >
              <p className="font-medium">{group.institutionName}</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item.plaidItemId}>
                    {item.recommended === "keep" ? "Keep" : "Disconnect"} ·{" "}
                    {item.accountCount} accounts · {item.transactionCount}{" "}
                    transactions · last sync{" "}
                    {item.lastSyncAt
                      ? new Date(item.lastSyncAt).toLocaleString()
                      : "never"}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {dryRun.duplicateAccounts.length > 0 ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              {dryRun.duplicateAccounts.length} duplicate account group
              {dryRun.duplicateAccounts.length === 1 ? "" : "s"} detected (
              {dryRun.duplicateTransactionCandidates} duplicate transaction
              candidates).
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void runRepair(false)}
            >
              Repair duplicates (preserve history)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:bg-destructive/10"
              disabled={busy}
              onClick={() => void runRepair(true)}
            >
              Repair and delete duplicate history
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={loading || busy}
              onClick={() => void loadDryRun()}
            >
              Refresh dry-run
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
