"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMoneyData, type UserDataExport } from "@/lib/storage/store";
import { useUserStatus } from "@/hooks/useUserStatus";
import {
  saveBoolean,
  saveString,
  loadString,
  STORAGE_KEYS,
} from "@/lib/storage/local-storage";
import type { AppMode } from "@/types/app-mode";

type SyncResponse = {
  ok?: boolean;
  updatedAt?: string | null;
  lastAccountDataSyncAt?: string | null;
  data?: UserDataExport | null;
  counts?: Record<string, number>;
  message?: string;
};

type MergeResponse = {
  success?: boolean;
  counts?: {
    bills?: number;
    incomeSources?: number;
    subscriptions?: number;
    alerts?: number;
    manualAccounts?: number;
    spendingLater?: number;
    skippedDuplicates?: number;
    reviewNeeded?: number;
  };
  message?: string;
};

export type AccountDataSyncContextValue = {
  enabled: boolean;
  busy: boolean;
  lastAccountDataSyncAt: string | null;
  refreshAccountData: () => Promise<boolean>;
  mergeLocalIntoAccount: () => Promise<MergeResponse | null>;
  pushAccountData: () => Promise<boolean>;
};

const AccountDataSyncContext =
  createContext<AccountDataSyncContextValue | null>(null);

function touchLocalModified() {
  saveString(
    STORAGE_KEYS.accountDataLocalModifiedAt,
    new Date().toISOString(),
  );
}

export function AccountDataSyncProvider({ children }: { children: ReactNode }) {
  const money = useMoneyData();
  const { status, loading: statusLoading } = useUserStatus();
  const enabled =
    money.hydrated &&
    !statusLoading &&
    status.signedIn &&
    status.databaseConfigured;

  const [busy, setBusy] = useState(false);
  const [lastAccountDataSyncAt, setLastAccountDataSyncAt] = useState<
    string | null
  >(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushInFlightRef = useRef(false);
  const initialPullDoneRef = useRef(false);
  const [pullReady, setPullReady] = useState(false);

  const applyAccountBundle = useCallback(
    (data: UserDataExport, updatedAt: string) => {
      money.importData(data);
      saveString(STORAGE_KEYS.accountDataSyncedAt, updatedAt);
      saveString(STORAGE_KEYS.accountDataLocalModifiedAt, updatedAt);
      setLastAccountDataSyncAt(updatedAt);
    },
    [money],
  );

  const pullAccountData = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;
    setBusy(true);
    try {
      const res = await fetch("/api/user/sync");
      const payload = (await res.json()) as SyncResponse;
      if (!res.ok || payload.ok === false) return false;

      const serverUpdatedAt = payload.updatedAt;
      const lastSynced = loadString(STORAGE_KEYS.accountDataSyncedAt);
      const localModified = loadString(STORAGE_KEYS.accountDataLocalModifiedAt);

      if (payload.lastAccountDataSyncAt) {
        setLastAccountDataSyncAt(payload.lastAccountDataSyncAt);
      }

      if (!payload.data) return true;

      const serverIsNewer =
        !!serverUpdatedAt &&
        (!lastSynced ||
          new Date(serverUpdatedAt).getTime() > new Date(lastSynced).getTime());
      const localChangedSinceSync =
        !!localModified &&
        !!lastSynced &&
        new Date(localModified).getTime() > new Date(lastSynced).getTime();

      if (serverIsNewer && !localChangedSinceSync && serverUpdatedAt) {
        applyAccountBundle(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            appMode: (payload.data.appMode as AppMode) ?? money.appMode,
            bills: payload.data.bills ?? [],
            income: payload.data.income ?? [],
            subscriptions: payload.data.subscriptions ?? [],
            alerts: payload.data.alerts ?? [],
            spendingLater: payload.data.spendingLater ?? [],
            manualAccounts: payload.data.manualAccounts ?? [],
          },
          serverUpdatedAt,
        );
      }

      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
      setPullReady(true);
    }
  }, [enabled, applyAccountBundle, money.appMode]);

  const pushAccountData = useCallback(async (): Promise<boolean> => {
    if (!enabled || pushInFlightRef.current) return false;
    pushInFlightRef.current = true;
    setBusy(true);
    try {
      const payload = money.exportData();
      touchLocalModified();
      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok || data.ok === false) return false;
      if (data.updatedAt) {
        saveString(STORAGE_KEYS.accountDataSyncedAt, data.updatedAt);
        saveString(STORAGE_KEYS.accountDataLocalModifiedAt, data.updatedAt);
      }
      if (data.lastAccountDataSyncAt) {
        setLastAccountDataSyncAt(data.lastAccountDataSyncAt);
      }
      return true;
    } catch {
      return false;
    } finally {
      pushInFlightRef.current = false;
      setBusy(false);
    }
  }, [enabled, money]);

  const refreshAccountData = useCallback(async (): Promise<boolean> => {
    return pullAccountData();
  }, [pullAccountData]);

  const mergeLocalIntoAccount =
    useCallback(async (): Promise<MergeResponse | null> => {
      if (!enabled) return null;
      setBusy(true);
      try {
        const payload = money.exportData();
        const res = await fetch("/api/user/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "merge_local",
            data: payload,
          }),
        });
        const data = (await res.json()) as MergeResponse;
        if (!res.ok || data.success === false) {
          throw new Error(data.message ?? "Merge failed");
        }
        saveBoolean(STORAGE_KEYS.migrationCompleted, true);
        await pullAccountData();
        return data;
      } catch {
        return null;
      } finally {
        setBusy(false);
      }
    }, [enabled, money, pullAccountData]);

  useEffect(() => {
    if (!enabled || initialPullDoneRef.current) return;
    initialPullDoneRef.current = true;
    void pullAccountData();
  }, [enabled, pullAccountData]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      void pullAccountData();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, pullAccountData]);

  useEffect(() => {
    if (!enabled || !pullReady) return;
    touchLocalModified();
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void pushAccountData();
    }, 2000);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    enabled,
    pullReady,
    money.bills,
    money.income,
    money.subscriptions,
    money.alerts,
    money.spendingLater,
    money.manualAccounts,
    pushAccountData,
  ]);

  const value = useMemo(
    (): AccountDataSyncContextValue => ({
      enabled,
      busy,
      lastAccountDataSyncAt,
      refreshAccountData,
      mergeLocalIntoAccount,
      pushAccountData,
    }),
    [
      enabled,
      busy,
      lastAccountDataSyncAt,
      refreshAccountData,
      mergeLocalIntoAccount,
      pushAccountData,
    ],
  );

  return (
    <AccountDataSyncContext.Provider value={value}>
      {children}
    </AccountDataSyncContext.Provider>
  );
}

export function useAccountDataSync(): AccountDataSyncContextValue {
  const ctx = useContext(AccountDataSyncContext);
  if (!ctx) {
    throw new Error(
      "useAccountDataSync must be used within AccountDataSyncProvider",
    );
  }
  return ctx;
}
