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
  loadCollection,
} from "@/lib/storage/local-storage";
import type { AppMode } from "@/types/app-mode";
import {
  countBundleRecords,
  localDataFingerprint,
  logAccountSyncDev,
  shouldApplyAccountData,
  totalRecords,
  type DomainCounts,
} from "@/lib/sync/account-data-utils";

type SyncResponse = {
  ok?: boolean;
  source?: "database" | "empty";
  updatedAt?: string | null;
  lastAccountDataSyncAt?: string | null;
  data?: UserDataExport | null;
  counts?: DomainCounts;
  message?: string;
  error?: string;
};

type MergeResponse = {
  success?: boolean;
  counts?: Record<string, number>;
  beforeCounts?: DomainCounts;
  afterCounts?: DomainCounts;
  warning?: string;
  message?: string;
};

export type SyncDiagnostics = {
  lastPullAt: string | null;
  lastPushAt: string | null;
  lastMergeAt: string | null;
  lastLoadedFrom: "database" | "local" | null;
  lastError: string | null;
  localCounts: DomainCounts;
  accountCounts: DomainCounts;
  lastMergeResult: Record<string, number> | null;
};

export type AccountDataSyncContextValue = {
  enabled: boolean;
  busy: boolean;
  initialSyncComplete: boolean;
  lastAccountDataSyncAt: string | null;
  syncError: string | null;
  diagnostics: SyncDiagnostics;
  refreshAccountData: () => Promise<boolean>;
  mergeLocalIntoAccount: () => Promise<MergeResponse | null>;
  pushAccountData: () => Promise<boolean>;
};

const defaultDiagnostics: SyncDiagnostics = {
  lastPullAt: null,
  lastPushAt: null,
  lastMergeAt: null,
  lastLoadedFrom: null,
  lastError: null,
  localCounts: {
    bills: 0,
    income: 0,
    subscriptions: 0,
    alerts: 0,
    manualAccounts: 0,
    spendingLater: 0,
    weeklyReviews: 0,
  },
  accountCounts: {
    bills: 0,
    income: 0,
    subscriptions: 0,
    alerts: 0,
    manualAccounts: 0,
    spendingLater: 0,
    weeklyReviews: 0,
  },
  lastMergeResult: null,
};

const AccountDataSyncContext =
  createContext<AccountDataSyncContextValue | null>(null);

function loadDiagnostics(): SyncDiagnostics {
  if (typeof window === "undefined") return defaultDiagnostics;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.accountSyncDiagnostics);
    if (!raw) return defaultDiagnostics;
    return { ...defaultDiagnostics, ...(JSON.parse(raw) as SyncDiagnostics) };
  } catch {
    return defaultDiagnostics;
  }
}

function saveDiagnostics(next: SyncDiagnostics) {
  saveString(STORAGE_KEYS.accountSyncDiagnostics, JSON.stringify(next));
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
  const [initialSyncComplete, setInitialSyncComplete] = useState(!enabled);
  const [lastAccountDataSyncAt, setLastAccountDataSyncAt] = useState<
    string | null
  >(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics>(() =>
    typeof window === "undefined" ? defaultDiagnostics : loadDiagnostics(),
  );
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushInFlightRef = useRef(false);
  const initialPullDoneRef = useRef(false);
  const localDirtyRef = useRef(false);
  const lastUserEditGenerationRef = useRef(money.userEditGeneration);

  const updateDiagnostics = useCallback((patch: Partial<SyncDiagnostics>) => {
    setDiagnostics((prev) => {
      const next = { ...prev, ...patch };
      saveDiagnostics(next);
      return next;
    });
  }, []);

  const applyAccountBundle = useCallback(
    (data: UserDataExport, updatedAt: string, loadedFrom: "database") => {
      money.importData(data);
      saveString(STORAGE_KEYS.accountDataSyncedAt, updatedAt);
      saveString(STORAGE_KEYS.accountDataLocalModifiedAt, updatedAt);
      localDirtyRef.current = false;
      setLastAccountDataSyncAt(updatedAt);
      logAccountSyncDev("Applied account-backed bundle", {
        loadedFrom,
        updatedAt,
        counts: countBundleRecords(data),
      });
      updateDiagnostics({
        lastLoadedFrom: loadedFrom,
        lastError: null,
      });
    },
    [money, updateDiagnostics],
  );

  const pullAccountData = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;
    setBusy(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/user/sync");
      const payload = (await res.json()) as SyncResponse;
      if (!res.ok || payload.ok === false) {
        const message = payload.message ?? payload.error ?? "Could not load account data.";
        setSyncError(message);
        updateDiagnostics({ lastError: message });
        return false;
      }

      const localBundle = money.exportData();
      const localCounts = countBundleRecords(localBundle);
      const serverCounts = payload.counts ?? {
        bills: 0,
        income: 0,
        subscriptions: 0,
        alerts: 0,
        manualAccounts: 0,
        spendingLater: 0,
        weeklyReviews: 0,
      };

      updateDiagnostics({
        lastPullAt: new Date().toISOString(),
        localCounts,
        accountCounts: serverCounts,
      });

      if (payload.lastAccountDataSyncAt) {
        setLastAccountDataSyncAt(payload.lastAccountDataSyncAt);
      }

      if (!payload.data) {
        logAccountSyncDev("Account sync returned no data bundle", { source: payload.source });
        return true;
      }

      const shouldApply = shouldApplyAccountData({
        serverCounts,
        localBundle,
        localDirty: localDirtyRef.current,
        serverUpdatedAt: payload.updatedAt ?? null,
        lastSyncedAt: loadString(STORAGE_KEYS.accountDataSyncedAt),
      });

      if (shouldApply && payload.updatedAt) {
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
          payload.updatedAt,
          "database",
        );
      } else {
        logAccountSyncDev("Kept local state over account pull", {
          localDirty: localDirtyRef.current,
          localTotal: totalRecords(localCounts),
          serverTotal: totalRecords(serverCounts),
        });
        updateDiagnostics({ lastLoadedFrom: "local" });
      }

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load account data.";
      setSyncError(message);
      updateDiagnostics({ lastError: message });
      return false;
    } finally {
      setBusy(false);
      setInitialSyncComplete(true);
    }
  }, [enabled, money, applyAccountBundle, updateDiagnostics]);

  const pushAccountData = useCallback(async (): Promise<boolean> => {
    if (!enabled || pushInFlightRef.current) return false;
    pushInFlightRef.current = true;
    setBusy(true);
    try {
      const payload = money.exportData();
      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: payload,
          source: "local_mutation",
        }),
      });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok || data.ok === false) {
        const message = data.message ?? "Could not push account data.";
        setSyncError(message);
        updateDiagnostics({ lastError: message });
        return false;
      }
      if (data.updatedAt) {
        saveString(STORAGE_KEYS.accountDataSyncedAt, data.updatedAt);
        saveString(STORAGE_KEYS.accountDataLocalModifiedAt, data.updatedAt);
        localDirtyRef.current = false;
      }
      if (data.lastAccountDataSyncAt) {
        setLastAccountDataSyncAt(data.lastAccountDataSyncAt);
      }
      updateDiagnostics({
        lastPushAt: new Date().toISOString(),
        lastError: null,
        accountCounts: data.counts ?? diagnostics.accountCounts,
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not push account data.";
      setSyncError(message);
      updateDiagnostics({ lastError: message });
      return false;
    } finally {
      pushInFlightRef.current = false;
      setBusy(false);
    }
  }, [enabled, money, diagnostics.accountCounts, updateDiagnostics]);

  const refreshAccountData = useCallback(async (): Promise<boolean> => {
    return pullAccountData();
  }, [pullAccountData]);

  const mergeLocalIntoAccount =
    useCallback(async (): Promise<MergeResponse | null> => {
      if (!enabled) return null;
      setBusy(true);
      setSyncError(null);
      try {
        const payload = money.exportData();
        const localCounts = countBundleRecords(payload);
        const weeklyReviews = loadCollection(STORAGE_KEYS.weeklyReviews, []);
        if (totalRecords(localCounts) === 0 && weeklyReviews.length === 0) {
          const warning =
            "No local records were found or the local data format did not match expected records.";
          setSyncError(warning);
          updateDiagnostics({ lastError: warning });
          return { success: false, warning };
        }

        const res = await fetch("/api/user/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "merge_local",
            data: {
              ...payload,
              weeklyReviews,
            },
            deviceFingerprint: localDataFingerprint(payload),
          }),
        });
        const data = (await res.json()) as MergeResponse;
        if (!res.ok || data.success === false) {
          throw new Error(data.message ?? "Merge failed");
        }

        if (
          data.counts &&
          Object.entries(data.counts).every(([key, value]) => {
            if (key === "skippedDuplicates") return true;
            return (value ?? 0) === 0;
          })
        ) {
          const warning =
            "No local records were found or the local data format did not match expected records.";
          setSyncError(warning);
          updateDiagnostics({
            lastError: warning,
            lastMergeAt: new Date().toISOString(),
          });
          return { ...data, warning };
        }

        if (!data.warning) {
          saveBoolean(STORAGE_KEYS.migrationCompleted, true);
        }
        await pullAccountData();
        updateDiagnostics({
          lastMergeAt: new Date().toISOString(),
          lastMergeResult: data.counts ?? null,
          lastError: null,
          accountCounts: data.afterCounts ?? diagnostics.accountCounts,
        });
        return data;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not merge local data.";
        setSyncError(message);
        updateDiagnostics({ lastError: message });
        return null;
      } finally {
        setBusy(false);
      }
    }, [enabled, money, pullAccountData, diagnostics.accountCounts, updateDiagnostics]);

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
    if (!enabled || !initialSyncComplete) return;
    if (money.userEditGeneration === lastUserEditGenerationRef.current) return;
    lastUserEditGenerationRef.current = money.userEditGeneration;
    localDirtyRef.current = true;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void pushAccountData();
    }, 1500);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [enabled, initialSyncComplete, money.userEditGeneration, pushAccountData]);

  const value = useMemo(
    (): AccountDataSyncContextValue => ({
      enabled,
      busy,
      initialSyncComplete,
      lastAccountDataSyncAt,
      syncError,
      diagnostics,
      refreshAccountData,
      mergeLocalIntoAccount,
      pushAccountData,
    }),
    [
      enabled,
      busy,
      initialSyncComplete,
      lastAccountDataSyncAt,
      syncError,
      diagnostics,
      refreshAccountData,
      mergeLocalIntoAccount,
      pushAccountData,
    ],
  );

  return (
    <AccountDataSyncContext.Provider value={value}>
      {enabled && !initialSyncComplete ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] bg-primary/10 px-4 py-1 text-center text-[11px] text-primary">
          Loading account data…
        </div>
      ) : null}
      {syncError ? (
        <div className="fixed inset-x-0 top-0 z-[99] border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning">
          {syncError}
        </div>
      ) : null}
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
