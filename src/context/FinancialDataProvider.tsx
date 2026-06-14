"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppMode, ModeDisplayLabel } from "@/types/app-mode";
import {
  computeDashboardSummary,
  computeIncomeSummary,
  computeSpendingSummary,
  dataSourceBadgeText,
  isManualDataEmpty,
  resolveAccounts,
  resolveDataSource,
  resolveTransactions,
  type DashboardSummary,
  type IncomeSummary,
  type SpendingSummary,
} from "@/lib/data-source";
import { syncAlerts, countActiveReviewAlerts } from "@/lib/alert-sync";
import { buildActionItems } from "@/lib/action-center";
import { detectRecurringSuggestions } from "@/lib/recurring-detection";
import {
  getModeDisplayLabel,
  resolveEffectiveMode,
} from "@/lib/app-mode";
import { useMoneyData } from "@/lib/storage/store";
import type { Account, Alert, Bill, IncomeSource, PlannedExpense, Subscription } from "@/types/money";
import type { ActionItem, ConnectedInstitutionDisplay, RecurringSuggestion } from "@/types/actions";
import type {
  DataSource,
  LinkedAccount,
  MoneyTransaction,
  PlaidConnectionStatus,
} from "@/types/transactions";

export interface FinancialDataContextValue {
  loading: boolean;
  configured: boolean;
  busy: boolean;
  error: string | null;

  storedMode: AppMode;
  effectiveMode: AppMode;
  modeLabel: ModeDisplayLabel;

  dataSource: DataSource;
  dataSourceBadge: string;
  isManualEmpty: boolean;

  plaidConnectionStatus: PlaidConnectionStatus;
  lastSyncAt: string | null;

  accounts: Account[];
  linkedAccounts: LinkedAccount[];
  transactions: MoneyTransaction[];

  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
  manualAccounts: Account[];

  incomeSummary: IncomeSummary;
  dashboardSummary: DashboardSummary;
  spendingSummary: SpendingSummary;
  syncedReviewCount: number;
  recurringSuggestions: RecurringSuggestion[];
  actionItems: ActionItem[];
  connectedInstitutions: ConnectedInstitutionDisplay[];

  plaidConnected: boolean;

  handleLinkSuccess: (publicToken: string) => Promise<void>;
  syncTransactions: () => Promise<void>;
  disconnectSandbox: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const FinancialDataContext = createContext<FinancialDataContextValue | null>(
  null,
);

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const money = useMoneyData();
  const {
    bills,
    income,
    subscriptions,
    alerts: storedAlerts,
    spendingLater,
    appMode: storedMode,
    manualAccounts,
    hydrated,
    dismissedRecurringIds,
    dismissedActionIds,
    replaceAlerts,
  } = money;

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [plaidConnectionStatus, setPlaidConnectionStatus] =
    useState<PlaidConnectionStatus>("not_connected");
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<
    MoneyTransaction[]
  >([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plaidConnected = plaidConnectionStatus === "connected";
  const effectiveMode = resolveEffectiveMode(storedMode, plaidConnected);
  const modeLabel = getModeDisplayLabel(storedMode, plaidConnected);
  const manualEmpty = isManualDataEmpty({
    bills,
    income,
    subscriptions,
    alerts: storedAlerts,
  });

  const loadSandboxData = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const accountsRes = await postJson("/api/plaid/accounts");
      if (accountsRes.error) throw new Error(accountsRes.error);
      if (Array.isArray(accountsRes.accounts)) {
        setLinkedAccounts(accountsRes.accounts);
      }

      const txnRes = await postJson("/api/plaid/sync-transactions");
      if (txnRes.error) throw new Error(txnRes.error);
      if (Array.isArray(txnRes.transactions)) {
        setPlaidTransactions(txnRes.transactions);
        setPlaidConnectionStatus("connected");
        if (txnRes.lastSyncAt) setLastSyncAt(txnRes.lastSyncAt);
      }
    } catch (e) {
      setPlaidConnectionStatus("error");
      setError(e instanceof Error ? e.message : "Could not load sandbox data.");
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/status").then((r) => r.json());
      setConfigured(Boolean(res.configured));
      setLastSyncAt(res.lastSyncAt ?? null);
      if (res.connected) {
        setPlaidConnectionStatus("connected");
        await loadSandboxData();
      } else {
        setPlaidConnectionStatus("not_connected");
        setLinkedAccounts([]);
        setPlaidTransactions([]);
      }
    } catch {
      setError("Could not reach the Plaid status endpoint.");
    } finally {
      setLoading(false);
    }
  }, [loadSandboxData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  const handleLinkSuccess = useCallback(
    async (publicToken: string) => {
      setBusy(true);
      setPlaidConnectionStatus("connecting");
      setError(null);
      try {
        const res = await postJson("/api/plaid/exchange-public-token", {
          public_token: publicToken,
        });
        if (res.configured === false) {
          setError("Plaid is not configured.");
          setPlaidConnectionStatus("not_connected");
          return;
        }
        if (res.error) throw new Error(res.error);
        await loadSandboxData();
      } catch (e) {
        setPlaidConnectionStatus("error");
        setError(
          e instanceof Error ? e.message : "Could not connect the sandbox bank.",
        );
      } finally {
        setBusy(false);
      }
    },
    [loadSandboxData],
  );

  const syncTransactions = useCallback(async () => {
    await loadSandboxData();
  }, [loadSandboxData]);

  const disconnectSandbox = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await postJson("/api/plaid/disconnect");
      if (res.error) throw new Error(res.error);
      setPlaidConnectionStatus("not_connected");
      setLinkedAccounts([]);
      setPlaidTransactions([]);
      setLastSyncAt(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not disconnect sandbox session.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const dataSource = resolveDataSource(plaidConnected, storedMode);
  const accounts = resolveAccounts(
    plaidConnected,
    linkedAccounts,
    storedMode,
    manualAccounts,
  );
  const transactions = resolveTransactions(
    plaidConnected,
    plaidTransactions,
    storedMode,
  );

  const recurringSuggestions = useMemo(
    () =>
      detectRecurringSuggestions({
        transactions,
        bills,
        subscriptions,
        income,
        dismissedIds: dismissedRecurringIds,
      }),
    [transactions, bills, subscriptions, income, dismissedRecurringIds],
  );

  const connectedInstitutions = useMemo((): ConnectedInstitutionDisplay[] => {
    if (!plaidConnected || linkedAccounts.length === 0) return [];
    const byInstitution = new Map<string, typeof linkedAccounts>();
    for (const account of linkedAccounts) {
      const key = account.institution || "Connected bank";
      const list = byInstitution.get(key) ?? [];
      list.push(account);
      byInstitution.set(key, list);
    }
    return [...byInstitution.entries()].map(([institutionName, accounts], i) => ({
      id: `inst-${i}-${institutionName}`,
      institutionName,
      accountCount: accounts.length,
      status: "connected" as const,
      connectedAt: lastSyncAt ?? new Date().toISOString(),
      lastSyncAt,
      source: "plaid_sandbox" as const,
    }));
  }, [plaidConnected, linkedAccounts, lastSyncAt]);

  const incomeSummary = useMemo(
    () =>
      computeIncomeSummary(
        income,
        storedMode,
        plaidConnected,
        transactions,
        manualEmpty,
      ),
    [income, storedMode, plaidConnected, transactions, manualEmpty],
  );

  const spendingSummary = useMemo(
    () =>
      computeSpendingSummary(
        transactions,
        storedMode,
        plaidConnected,
        manualEmpty,
      ),
    [transactions, storedMode, plaidConnected, manualEmpty],
  );

  const dashboardSummary = useMemo(
    () =>
      computeDashboardSummary({
        accounts,
        bills,
        income,
        subscriptions,
        alerts: storedAlerts,
        storedMode,
        plaidConnected,
        transactions,
      }),
    [
      accounts,
      bills,
      income,
      subscriptions,
      storedAlerts,
      storedMode,
      plaidConnected,
      transactions,
    ],
  );

  const syncedAlerts = useMemo(
    () =>
      syncAlerts({
        bills,
        income,
        subscriptions,
        spendingLater,
        accounts,
        transactions,
        recurringSuggestions,
        dashboardStatus: dashboardSummary.status,
        cashAvailable: dashboardSummary.cashAvailable,
        existingAlerts: storedAlerts,
      }),
    [
      bills,
      income,
      subscriptions,
      spendingLater,
      accounts,
      transactions,
      recurringSuggestions,
      dashboardSummary.status,
      dashboardSummary.cashAvailable,
      storedAlerts,
    ],
  );

  useEffect(() => {
    if (!hydrated) return;
    const storedSynced = storedAlerts.filter(
      (a) => a.id.startsWith("sync:") || a.syncType,
    );
    const nextSynced = syncedAlerts.filter(
      (a) => a.id.startsWith("sync:") || a.syncType,
    );
    const userAlerts = storedAlerts.filter(
      (a) => !a.id.startsWith("sync:") && !a.syncType,
    );
    const nextUser = syncedAlerts.filter(
      (a) => !a.id.startsWith("sync:") && !a.syncType,
    );
    const same =
      storedSynced.length === nextSynced.length &&
      userAlerts.length === nextUser.length &&
      storedSynced.every((a, i) => {
        const b = nextSynced[i];
        return (
          b &&
          a.id === b.id &&
          a.status === b.status &&
          a.title === b.title
        );
      });
    if (!same) {
      replaceAlerts(syncedAlerts);
    }
  }, [hydrated, syncedAlerts, storedAlerts, replaceAlerts]);

  const alerts = syncedAlerts;
  const syncedReviewCount = countActiveReviewAlerts(alerts);

  const actionItems = useMemo(
    () =>
      buildActionItems({
        alerts,
        bills,
        subscriptions,
        spendingLater,
        recurringSuggestions,
        dismissedActionIds,
      }),
    [
      alerts,
      bills,
      subscriptions,
      spendingLater,
      recurringSuggestions,
      dismissedActionIds,
    ],
  );

  const value = useMemo<FinancialDataContextValue>(
    () => ({
      loading,
      configured,
      busy,
      error,
      storedMode,
      effectiveMode,
      modeLabel,
      dataSource,
      dataSourceBadge: dataSourceBadgeText(storedMode, plaidConnected, manualEmpty),
      isManualEmpty: manualEmpty,
      plaidConnectionStatus,
      lastSyncAt,
      accounts,
      linkedAccounts,
      transactions,
      bills,
      income,
      subscriptions,
      alerts,
      spendingLater,
      manualAccounts,
      incomeSummary,
      dashboardSummary,
      spendingSummary,
      syncedReviewCount,
      recurringSuggestions,
      actionItems,
      connectedInstitutions,
      plaidConnected,
      handleLinkSuccess,
      syncTransactions,
      disconnectSandbox,
      refreshData,
    }),
    [
      loading,
      configured,
      busy,
      error,
      storedMode,
      effectiveMode,
      modeLabel,
      dataSource,
      manualEmpty,
      plaidConnectionStatus,
      lastSyncAt,
      accounts,
      linkedAccounts,
      transactions,
      bills,
      income,
      subscriptions,
      alerts,
      spendingLater,
      manualAccounts,
      incomeSummary,
      dashboardSummary,
      spendingSummary,
      syncedReviewCount,
      recurringSuggestions,
      actionItems,
      connectedInstitutions,
      plaidConnected,
      handleLinkSuccess,
      syncTransactions,
      disconnectSandbox,
      refreshData,
    ],
  );

  return (
    <FinancialDataContext.Provider value={value}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData(): FinancialDataContextValue {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) {
    throw new Error(
      "useFinancialData must be used within a FinancialDataProvider",
    );
  }
  return ctx;
}

/** Backward-compatible alias for components still using usePlaid(). */
export function usePlaidFromFinancialData() {
  const fd = useFinancialData();
  return {
    loading: fd.loading,
    configured: fd.configured,
    status:
      fd.plaidConnectionStatus === "connected"
        ? ("connected" as const)
        : fd.plaidConnectionStatus === "error"
          ? ("error" as const)
          : ("not_connected" as const),
    source:
      fd.dataSource === "plaid_sandbox"
        ? ("plaid_sandbox" as const)
        : ("mock" as const),
    accounts: fd.linkedAccounts,
    transactions: fd.transactions,
    lastSyncAt: fd.lastSyncAt,
    busy: fd.busy,
    error: fd.error,
    handleLinkSuccess: fd.handleLinkSuccess,
    syncNow: fd.syncTransactions,
    disconnect: fd.disconnectSandbox,
  };
}
