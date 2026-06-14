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

export function LocalDataMigrationDialog() {
  const money = useMoneyData();
  const appMode = useAppMode();
  const toast = useToast();
  const { status, loading } = useUserStatus();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

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
  };

  const saveLocal = async () => {
    setBusy(true);
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
      if (!res.ok) throw new Error("Migration failed");
      toast("Local data saved to your account");
      complete();
    } catch {
      toast("Could not save data to account");
    } finally {
      setBusy(false);
    }
  };

  const keepLocal = async () => {
    setBusy(true);
    try {
      await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "keep_local" }),
      });
      toast("Keeping local data only");
      complete();
    } finally {
      setBusy(false);
    }
  };

  const loadAccountDataFromServer = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use_account" }),
      });
      const data = await res.json();
      if (!res.ok || !data.accountData) throw new Error("Load failed");
      money.importData({
        version: 1,
        exportedAt: new Date().toISOString(),
        appMode: data.accountData.appMode ?? "local_user",
        bills: data.accountData.bills ?? [],
        income: data.accountData.income ?? [],
        subscriptions: data.accountData.subscriptions ?? [],
        alerts: data.accountData.alerts ?? [],
        spendingLater: [],
      });
      toast("Loaded data from your account");
      complete();
    } catch {
      toast("Could not load account data");
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
          Your choice is remembered on this device. Plaid sandbox tokens are not
          persisted to the database in Phase 9.
        </p>
      </div>
    </Dialog>
  );
}
