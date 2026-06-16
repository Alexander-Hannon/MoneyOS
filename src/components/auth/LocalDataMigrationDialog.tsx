"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMoneyData } from "@/lib/storage/store";
import { useAppMode } from "@/context/AppModeProvider";
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
    bills: number;
    incomeSources: number;
    subscriptions: number;
    alerts: number;
    consentRecords: number;
    manualAccounts: number;
    spendingLater: number;
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

export function LocalDataMigrationDialog() {
  const money = useMoneyData();
  const appMode = useAppMode();
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
    !loadBoolean(STORAGE_KEYS.migrationCompleted) &&
    hasExistingUserData() &&
    !dismissed;

  const complete = () => {
    saveBoolean(STORAGE_KEYS.migrationCompleted, true);
    setDismissed(true);
    setError(null);
  };

  const saveLocal = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = money.exportData();
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_local",
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

      const total =
        (data.counts?.bills ?? 0) +
        (data.counts?.incomeSources ?? 0) +
        (data.counts?.subscriptions ?? 0) +
        (data.counts?.alerts ?? 0);

      toast(
        total > 0
          ? `Saved ${total} record${total === 1 ? "" : "s"} to your account`
          : "Local data saved to your account",
      );
      complete();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not save data to account";
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
      toast("Keeping local data only");
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
      toast("Loaded data from your account");
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
      title="Save your local MoneyOS data?"
      description="You signed in with existing local data on this device. Choose how to proceed."
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
          onClick={() => void saveLocal()}
        >
          Save to account
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => void keepLocal()}
        >
          Keep local only
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => void loadAccountDataFromServer()}
        >
          Replace with account data
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Your choice is remembered on this device only after a successful
          response. Plaid sandbox tokens are persisted only when you are signed
          in, the database is configured, and token encryption is enabled. If
          you use the same database across devices, use the same
          PLAID_TOKEN_ENCRYPTION_KEY on each device.
        </p>
      </div>
    </Dialog>
  );
}
