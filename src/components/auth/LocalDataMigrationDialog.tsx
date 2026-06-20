"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMoneyData } from "@/lib/storage/store";
import { useAppMode } from "@/context/AppModeProvider";
import { useAccountDataSync } from "@/context/AccountDataSyncProvider";
import { useToast } from "@/components/ui/toast";
import {
  hasExistingUserData,
  loadBoolean,
  saveBoolean,
  STORAGE_KEYS,
} from "@/lib/storage/local-storage";
import { isClerkPublishableConfigured } from "@/lib/auth/config-client";
import { useUserStatus } from "@/hooks/useUserStatus";

type MigrationResponse = {
  success?: boolean;
  errorCode?: string;
  message?: string;
  counts?: {
    bills?: number;
    incomeSources?: number;
    subscriptions?: number;
    alerts?: number;
    consentRecords?: number;
    manualAccounts?: number;
    spendingLater?: number;
    skippedDuplicates?: number;
    reviewNeeded?: number;
  };
  accountData?: {
    appMode?: string;
    bills?: unknown[];
    income?: unknown[];
    subscriptions?: unknown[];
    alerts?: unknown[];
    manualAccounts?: unknown[];
    spendingLater?: unknown[];
  };
};

function migrationErrorMessage(data: MigrationResponse): string {
  if (data.errorCode === "migration_timeout") {
    return "Migration took too long. Your local data is still safe on this device. Try again or keep local only.";
  }
  return data.message ?? "Could not complete migration.";
}

function formatMergeCounts(counts: MigrationResponse["counts"]): string {
  if (!counts) return "Local data merged into your MoneyOS account.";
  const parts = [
    counts.bills ? `${counts.bills} bill${counts.bills === 1 ? "" : "s"}` : null,
    counts.subscriptions
      ? `${counts.subscriptions} subscription${counts.subscriptions === 1 ? "" : "s"}`
      : null,
    counts.incomeSources
      ? `${counts.incomeSources} income source${counts.incomeSources === 1 ? "" : "s"}`
      : null,
    counts.manualAccounts
      ? `${counts.manualAccounts} manual account${counts.manualAccounts === 1 ? "" : "s"}`
      : null,
    counts.spendingLater
      ? `${counts.spendingLater} planned expense${counts.spendingLater === 1 ? "" : "s"}`
      : null,
    counts.alerts
      ? `${counts.alerts} alert${counts.alerts === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);
  const summary =
    parts.length > 0 ? parts.join(", ") : "records";
  const skipped =
    counts.skippedDuplicates && counts.skippedDuplicates > 0
      ? ` (${counts.skippedDuplicates} duplicate${counts.skippedDuplicates === 1 ? "" : "s"} skipped — account records kept)`
      : "";
  return `Merged ${summary} into your MoneyOS account${skipped}.`;
}

export function LocalDataMigrationDialog() {
  const money = useMoneyData();
  const appMode = useAppMode();
  const accountSync = useAccountDataSync();
  const toast = useToast();
  const { status, loading } = useUserStatus();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldPrompt =
    money.hydrated &&
    !loading &&
    isClerkPublishableConfigured() &&
    status.signedIn &&
    status.databaseConfigured &&
    !loadBoolean(STORAGE_KEYS.migrationCompleted) &&
    hasExistingUserData() &&
    !dismissed;

  const complete = () => {
    saveBoolean(STORAGE_KEYS.migrationCompleted, true);
    setDismissed(true);
    setError(null);
  };

  const mergeLocal = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = money.exportData();
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge_local",
          data: {
            ...payload,
            consentHistory: appMode.consentHistory,
          },
        }),
      });
      const data = (await res.json()) as MigrationResponse;
      if (!res.ok || data.success === false) {
        throw new Error(migrationErrorMessage(data));
      }

      toast(formatMergeCounts(data.counts));
      await accountSync.refreshAccountData();
      complete();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not merge data to account";
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  };

  const keepLocal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "keep_local" }),
      });
      const data = (await res.json()) as MigrationResponse;
      if (!res.ok || data.success === false) {
        throw new Error(migrationErrorMessage(data));
      }
      toast("Keeping local data only on this device");
      complete();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not update migration preference";
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  };

  const loadAccountDataFromServer = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use_account" }),
      });
      const data = (await res.json()) as MigrationResponse;
      if (!res.ok || data.success === false || !data.accountData) {
        throw new Error(migrationErrorMessage(data));
      }

      money.importData({
        version: 1,
        exportedAt: new Date().toISOString(),
        appMode: (data.accountData.appMode as "local_user") ?? "local_user",
        bills: (data.accountData.bills ?? []) as never[],
        income: (data.accountData.income ?? []) as never[],
        subscriptions: (data.accountData.subscriptions ?? []) as never[],
        alerts: (data.accountData.alerts ?? []) as never[],
        spendingLater: (data.accountData.spendingLater ?? []) as never[],
        manualAccounts: (data.accountData.manualAccounts ?? []) as never[],
      });
      toast("Loaded data from your MoneyOS account");
      complete();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not load account data";
      setError(message);
      toast(message);
    } finally {
      setBusy(false);
    }
  };

  if (!shouldPrompt) return null;

  return (
    <Dialog
      open={shouldPrompt}
      onClose={() => {}}
      title="Merge local data into your MoneyOS account?"
      description="You signed in with existing local data on this device. Your signed-in account is the source of truth across devices once merged."
      className="sm:max-w-lg"
    >
      <div className="space-y-3">
        {error && (
          <p className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <Button
          size="sm"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => void mergeLocal()}
        >
          Merge local data into my MoneyOS account
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => void keepLocal()}
        >
          Keep local only on this device
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => void loadAccountDataFromServer()}
        >
          Use account data on this device
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Local data is preserved until the server confirms a successful merge.
          Running merge twice will not create obvious duplicates. Plaid live
          tokens stay encrypted server-side only.
        </p>
      </div>
    </Dialog>
  );
}
