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
  applyTransactionReviewDecision,
  mergeReviewDecisionIntoTransaction,
} from "@/lib/transaction-review/apply-decision";
import { recurringSuggestionIdForTransaction } from "@/lib/transaction-review/reconciliation";
import {
  applyTransactionReviewOverrides,
  saveTransactionReviewOverride,
} from "@/lib/storage/transaction-review-overrides";
import type { TransactionReviewPayload } from "@/types/transaction-review";
import {
  getModeDisplayLabel,
  resolveEffectiveMode,
} from "@/lib/app-mode";
import { useMoneyData } from "@/lib/storage/store";
import type { Account, Alert, Bill, IncomeSource, PlannedExpense, Subscription } from "@/types/money";
import type { ActionItem, ConnectedInstitutionDisplay, PlaidStorageMode, RecurringSuggestion } from "@/types/actions";
import type {
  DataSource,
  LinkedAccount,
  MoneyTransaction,
  PlaidConnectionStatus,
} from "@/types/transactions";
import type { PlaidEnvironment, PlaidLinkTarget } from "@/lib/plaid/plaid-env";
import type { BalanceRefreshQuota } from "@/lib/db/balance-refresh-events";

export interface FinancialDataContextValue {
  loading: boolean;
  configured: boolean;
  plaidEnv: string | null;
  busy: boolean;
  error: string | null;

  storedMode: AppMode;
  effectiveMode: AppMode;
  modeLabel: ModeDisplayLabel;

  dataSource: DataSource;
  dataSourceBadge: string;
  isManualEmpty: boolean;

  plaidConnectionStatus: PlaidConnectionStatus;
  activePlaidEnvironment: PlaidEnvironment | null;
  lastSyncAt: string | null;
  lastBalanceRefreshAt: string | null;
  balanceRefreshQuota: BalanceRefreshQuota | null;

  livePlaidEnabled: boolean;
  liveUserAllowed: boolean;
  sandboxConnectAvailable: boolean;
  sandboxConnected: boolean;
  liveConnected: boolean;

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
  sandboxInstitutions: ConnectedInstitutionDisplay[];
  liveInstitutions: ConnectedInstitutionDisplay[];

  plaidConnected: boolean;
  plaidStorageMode: PlaidStorageMode;
  encryptionConfigured: boolean;
  persistentPlaidEnabled: boolean;
  devOnlyPlaidWarning: string | null;

  handleLinkSuccess: (
    publicToken: string,
    targetEnvironment?: PlaidLinkTarget,
  ) => Promise<{ connectionKind: "new" | "refreshed"; message: string } | null>;
  syncTransactions: (plaidItemId?: string) => Promise<void>;
  refreshBalances: (
    plaidItemId?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  loadBalanceRefreshQuota: () => Promise<void>;
  disconnectPlaid: (
    plaidItemId?: string,
    options?: { deleteHistory?: boolean },
  ) => Promise<void>;
  /** @deprecated Use disconnectPlaid */
  disconnectSandbox: (plaidItemId?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  submitTransactionReview: (
    transactionId: string,
    payload: TransactionReviewPayload,
  ) => Promise<{
    ok: boolean;
    transaction?: MoneyTransaction;
    persisted: "database" | "local";
    error?: string;
  }>;
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
    dismissRecurringSuggestion,
  } = money;

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [plaidEnv, setPlaidEnv] = useState<string | null>(null);
  const [plaidConnectionStatus, setPlaidConnectionStatus] =
    useState<PlaidConnectionStatus>("not_connected");
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [plaidTransactions, setPlaidTransactions] = useState<
    MoneyTransaction[]
  >([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastBalanceRefreshAt, setLastBalanceRefreshAt] = useState<string | null>(
    null,
  );
  const [activePlaidEnvironment, setActivePlaidEnvironment] =
    useState<PlaidEnvironment | null>(null);
  const [livePlaidEnabled, setLivePlaidEnabled] = useState(false);
  const [liveUserAllowed, setLiveUserAllowed] = useState(false);
  const [sandboxConnectAvailable, setSandboxConnectAvailable] = useState(false);
  const [sandboxConnected, setSandboxConnected] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [sandboxInstitutions, setSandboxInstitutions] = useState<
    ConnectedInstitutionDisplay[]
  >([]);
  const [liveInstitutions, setLiveInstitutions] = useState<
    ConnectedInstitutionDisplay[]
  >([]);
  const [plaidStorageMode, setPlaidStorageMode] =
    useState<PlaidStorageMode>("none");
  const [encryptionConfigured, setEncryptionConfigured] = useState(false);
  const [persistentPlaidEnabled, setPersistentPlaidEnabled] = useState(false);
  const [devOnlyPlaidWarning, setDevOnlyPlaidWarning] = useState<string | null>(
    null,
  );
  const [apiInstitutions, setApiInstitutions] = useState<
    ConnectedInstitutionDisplay[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceRefreshQuota, setBalanceRefreshQuota] =
    useState<BalanceRefreshQuota | null>(null);
  const [reviewOverrideVersion, setReviewOverrideVersion] = useState(0);
  const plaidLoadInFlightRef = useRef<string | null>(null);

  const plaidConnected = plaidConnectionStatus === "connected";
  const effectiveMode = resolveEffectiveMode(
    storedMode,
    plaidConnected,
    activePlaidEnvironment,
  );
  const modeLabel = getModeDisplayLabel(
    storedMode,
    plaidConnected,
    activePlaidEnvironment,
  );
  const manualEmpty = isManualDataEmpty({
    bills,
    income,
    subscriptions,
    alerts: storedAlerts,
  });

  const mapInstitution = useCallback(
    (inst: {
      id: string;
      plaidItemId?: string | null;
      institutionName: string;
      accountCount: number;
      status: ConnectedInstitutionDisplay["status"];
      connectedAt: string;
      lastSyncAt: string | null;
      source: ConnectedInstitutionDisplay["source"];
      environment?: PlaidEnvironment;
    }): ConnectedInstitutionDisplay => ({
      id: inst.id,
      plaidItemId: inst.plaidItemId,
      institutionName: inst.institutionName,
      accountCount: inst.accountCount,
      status: inst.status,
      connectedAt: inst.connectedAt,
      lastSyncAt: inst.lastSyncAt,
      source: inst.source,
      environment:
        inst.environment ??
        (inst.source === "plaid_live" ? "production" : "sandbox"),
    }),
    [],
  );

  const applyStatusResponse = useCallback(
    (res: Record<string, unknown>) => {
      setConfigured(Boolean(res.plaidConfigValid ?? res.configured));
      setPlaidEnv((res.plaidEnv as string | null) ?? null);
      setLastSyncAt((res.lastSyncAt as string | null) ?? null);
      setLastBalanceRefreshAt((res.lastBalanceRefreshAt as string | null) ?? null);
      setPlaidStorageMode(
        (res.storageMode as PlaidStorageMode | undefined) ?? "none",
      );
      setEncryptionConfigured(Boolean(res.encryptionConfigured));
      setPersistentPlaidEnabled(Boolean(res.persistentPlaidEnabled));
      setDevOnlyPlaidWarning((res.devOnlyWarning as string | null) ?? null);
      setLivePlaidEnabled(Boolean(res.livePlaidEnabled));
      setLiveUserAllowed(Boolean(res.liveUserAllowed));
      setSandboxConnectAvailable(Boolean(res.sandboxConnectAvailable));
      setSandboxConnected(Boolean(res.sandboxConnected));
      setLiveConnected(Boolean(res.liveConnected));
      setActivePlaidEnvironment(
        (res.activeEnvironment as PlaidEnvironment | null) ?? null,
      );

      const mapList = (list: unknown[]) =>
        Array.isArray(list)
          ? list.map((inst) =>
              mapInstitution(inst as Parameters<typeof mapInstitution>[0]),
            )
          : [];

      setSandboxInstitutions(mapList(res.sandboxInstitutions as unknown[]));
      setLiveInstitutions(mapList(res.liveInstitutions as unknown[]));
      setApiInstitutions(mapList(res.institutions as unknown[]));

      if (
        res.liveConnected &&
        res.activeEnvironment === "production"
      ) {
        void fetch("/api/plaid/balance-refresh-quota")
          .then((r) => r.json())
          .then((data) => {
            if (data.quota) setBalanceRefreshQuota(data.quota);
          })
          .catch(() => setBalanceRefreshQuota(null));
      }
    },
    [mapInstitution],
  );

  const loadPlaidData = useCallback(
    async (args?: {
      plaidItemId?: string;
      environment?: PlaidEnvironment | null;
      forceSync?: boolean;
    }) => {
      const environment = args?.environment ?? activePlaidEnvironment;
      const forceSync = args?.forceSync === true;
      const loadKey = `${environment ?? "all"}:${args?.plaidItemId ?? "all"}:${forceSync ? "sync" : "cache"}`;
      if (plaidLoadInFlightRef.current === loadKey) return;

      plaidLoadInFlightRef.current = loadKey;
      setBusy(true);
      setError(null);
      try {
        const accountsRes = await postJson("/api/plaid/accounts", {
          environment: environment ?? undefined,
        });
        if (accountsRes.error) throw new Error(accountsRes.error);
        if (Array.isArray(accountsRes.accounts)) {
          setLinkedAccounts(accountsRes.accounts);
        }
        if (accountsRes.lastBalanceRefreshAt) {
          setLastBalanceRefreshAt(accountsRes.lastBalanceRefreshAt);
        }

        const txnRes = await postJson("/api/plaid/sync-transactions", {
          plaidItemId: args?.plaidItemId,
          environment: environment ?? undefined,
          cachedOnly: !forceSync,
        });
        if (txnRes.error) throw new Error(txnRes.error);
        if (Array.isArray(txnRes.transactions)) {
          setPlaidTransactions(txnRes.transactions);
          setPlaidConnectionStatus("connected");
          if (txnRes.lastSyncAt) setLastSyncAt(txnRes.lastSyncAt);
          if (txnRes.lastBalanceRefreshAt) {
            setLastBalanceRefreshAt(txnRes.lastBalanceRefreshAt);
          }
          if (txnRes.environment) {
            setActivePlaidEnvironment(txnRes.environment);
          }
        }
        if (txnRes.storageMode) {
          setPlaidStorageMode(txnRes.storageMode);
        }
      } catch (e) {
        setPlaidConnectionStatus("error");
        setError(e instanceof Error ? e.message : "Could not load Plaid data.");
      } finally {
        if (plaidLoadInFlightRef.current === loadKey) {
          plaidLoadInFlightRef.current = null;
        }
        setBusy(false);
      }
    },
    [activePlaidEnvironment],
  );

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/status").then((r) => r.json());
      applyStatusResponse(res);

      if (res.connected) {
        setPlaidConnectionStatus("connected");
        await loadPlaidData({
          environment: res.activeEnvironment ?? null,
          forceSync: false,
        });
        try {
          const refreshed = await fetch("/api/plaid/status").then((r) => r.json());
          applyStatusResponse(refreshed);
        } catch {
          // Non-fatal — accounts/transactions already loaded.
        }
      } else {
        setPlaidConnectionStatus("not_connected");
        setLinkedAccounts([]);
        setPlaidTransactions([]);
        setApiInstitutions([]);
        setSandboxInstitutions([]);
        setLiveInstitutions([]);
      }
    } catch {
      setError("Could not reach the Plaid status endpoint.");
    } finally {
      setLoading(false);
    }
  }, [applyStatusResponse, loadPlaidData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  const handleLinkSuccess = useCallback(
    async (
      publicToken: string,
      targetEnvironment: PlaidLinkTarget = "sandbox",
    ): Promise<{ connectionKind: "new" | "refreshed"; message: string } | null> => {
      setBusy(true);
      setPlaidConnectionStatus("connecting");
      setError(null);
      try {
        const res = await postJson("/api/plaid/exchange-public-token", {
          public_token: publicToken,
          environment: targetEnvironment,
        });
        if (res.configured === false) {
          setError("Plaid is not configured.");
          setPlaidConnectionStatus("not_connected");
          return null;
        }
        if (res.error || res.errorCode) {
          throw new Error(res.message ?? res.error ?? "Connection failed.");
        }
        if (targetEnvironment === "production") {
          setActivePlaidEnvironment("production");
        }

        const connectionKind =
          res.connectionKind === "refreshed" ? "refreshed" : "new";
        const message =
          connectionKind === "refreshed"
            ? "Existing bank connection refreshed."
            : "New bank connection added.";

        const statusRes = await fetch("/api/plaid/status").then((r) => r.json());
        applyStatusResponse(statusRes);

        if (statusRes.connected) {
          setPlaidConnectionStatus("connected");
          await loadPlaidData({
            environment: statusRes.activeEnvironment ?? targetEnvironment,
            forceSync: false,
          });
        }

        return { connectionKind, message };
      } catch (e) {
        setPlaidConnectionStatus("error");
        setError(
          e instanceof Error ? e.message : "Could not connect the bank.",
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [applyStatusResponse, loadPlaidData],
  );

  const syncTransactions = useCallback(
    async (plaidItemId?: string) => {
      await loadPlaidData({
        plaidItemId,
        environment: activePlaidEnvironment,
        forceSync: true,
      });
      try {
        const res = await fetch("/api/plaid/status").then((r) => r.json());
        applyStatusResponse(res);
      } catch {
        // Non-fatal — sync already updated transactions/accounts.
      }
    },
    [loadPlaidData, activePlaidEnvironment, applyStatusResponse],
  );

  const loadBalanceRefreshQuota = useCallback(async () => {
    if (activePlaidEnvironment !== "production" || !liveConnected) return;
    try {
      const res = await fetch("/api/plaid/balance-refresh-quota").then((r) =>
        r.json(),
      );
      if (res.quota) setBalanceRefreshQuota(res.quota);
    } catch {
      setBalanceRefreshQuota(null);
    }
  }, [activePlaidEnvironment, liveConnected]);

  const refreshBalances = useCallback(
    async (plaidItemId?: string): Promise<{ ok: boolean; message?: string }> => {
      setBusy(true);
      setError(null);
      try {
        const res = await postJson("/api/plaid/refresh-balances", { plaidItemId });
        if (res.quota) setBalanceRefreshQuota(res.quota);
        if (res.ok === false || res.error || res.errorCode) {
          const message =
            res.message ?? res.error ?? "Balance refresh failed.";
          setError(message);
          return { ok: false, message };
        }
        if (res.lastBalanceRefreshAt) {
          setLastBalanceRefreshAt(res.lastBalanceRefreshAt);
        }
        await loadPlaidData({ environment: "production", plaidItemId });
        return {
          ok: true,
          message: (res.message as string) ?? "Live balances refreshed.",
        };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not refresh balances.";
        setError(message);
        return { ok: false, message };
      } finally {
        setBusy(false);
      }
    },
    [loadPlaidData],
  );

  const disconnectPlaid = useCallback(
    async (plaidItemId?: string, options?: { deleteHistory?: boolean }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await postJson("/api/plaid/disconnect", {
          plaidItemId,
          deleteHistory: options?.deleteHistory === true,
        });
        if (res.error) throw new Error(res.error);
        await refreshData();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not disconnect institution.",
        );
      } finally {
        setBusy(false);
      }
    },
    [refreshData],
  );

  const disconnectSandbox = disconnectPlaid;

  const baseTransactions = resolveTransactions(
    plaidConnected,
    plaidTransactions,
    storedMode,
    activePlaidEnvironment,
  );
  const transactions = useMemo(() => {
    void reviewOverrideVersion;
    return applyTransactionReviewOverrides(baseTransactions);
  }, [baseTransactions, reviewOverrideVersion]);

  const submitTransactionReview = useCallback(
    async (transactionId: string, payload: TransactionReviewPayload) => {
      const current =
        transactions.find((t) => t.id === transactionId) ??
        plaidTransactions.find((t) => t.id === transactionId);
      if (!current) {
        return {
          ok: false,
          persisted: "local" as const,
          error: "Transaction not found.",
        };
      }

      const bill = payload.linkedBillId
        ? (bills.find((b) => b.id === payload.linkedBillId) ?? null)
        : null;
      const subscription = payload.linkedSubscriptionId
        ? (subscriptions.find((s) => s.id === payload.linkedSubscriptionId) ??
          null)
        : null;

      const decision = applyTransactionReviewDecision({
        payload,
        bill,
        subscription,
      });
      const optimistic = mergeReviewDecisionIntoTransaction(current, decision);
      const previousPlaid = plaidTransactions;

      if (plaidConnected) {
        setPlaidTransactions((prev) =>
          prev.map((t) => (t.id === transactionId ? optimistic : t)),
        );
      }

      const dismissRecurringFor = (txn: MoneyTransaction) => {
        if (
          decision.isRecurringExcluded ||
          decision.recurringReviewState === "linked_to_bill" ||
          decision.recurringReviewState === "linked_to_subscription" ||
          decision.recurringReviewState === "not_recurring"
        ) {
          dismissRecurringSuggestion(recurringSuggestionIdForTransaction(txn));
        }
      };
      dismissRecurringFor(optimistic);

      try {
        const res = await fetch(`/api/user/transactions/${transactionId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            merchantPattern:
              payload.merchantPattern ??
              current.merchantName ??
              current.description,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.transaction) {
          setPlaidTransactions((prev) =>
            prev.map((t) => (t.id === transactionId ? data.transaction : t)),
          );
          return {
            ok: true,
            transaction: data.transaction as MoneyTransaction,
            persisted: "database" as const,
          };
        }

        if (res.status === 503 || res.status === 401 || res.status === 404) {
          saveTransactionReviewOverride(transactionId, {
            category: optimistic.category,
            classification: optimistic.classification,
            type: optimistic.type,
            needsReview: optimistic.needsReview,
            userConfirmedCategory: optimistic.userConfirmedCategory,
            reviewState: optimistic.reviewState,
            classificationSource: optimistic.classificationSource,
            linkedBillId: optimistic.linkedBillId,
            linkedSubscriptionId: optimistic.linkedSubscriptionId,
            isTransferInternal: optimistic.isTransferInternal,
            isRefund: optimistic.isRefund,
            isIncomeFlag: optimistic.isIncomeFlag,
            isRecurringExcluded: optimistic.isRecurringExcluded,
            recurringReviewState: optimistic.recurringReviewState,
            reviewedAt: optimistic.reviewedAt,
          });
          setReviewOverrideVersion((v) => v + 1);
          return {
            ok: true,
            transaction: optimistic,
            persisted: "local" as const,
          };
        }

        throw new Error(data.error ?? "Could not save transaction review.");
      } catch (error) {
        if (plaidConnected) {
          setPlaidTransactions(previousPlaid);
        }
        return {
          ok: false,
          persisted: "local" as const,
          error:
            error instanceof Error
              ? error.message
              : "Could not save transaction review.",
        };
      }
    },
    [
      transactions,
      plaidTransactions,
      bills,
      subscriptions,
      plaidConnected,
      dismissRecurringSuggestion,
    ],
  );

  const dataSource = resolveDataSource(
    plaidConnected,
    storedMode,
    activePlaidEnvironment,
  );
  const accounts = resolveAccounts(
    plaidConnected,
    linkedAccounts,
    storedMode,
    manualAccounts,
    activePlaidEnvironment,
  );
  const transactionsForContext = transactions;

  const recurringSuggestions = useMemo(
    () =>
      detectRecurringSuggestions({
        transactions: transactionsForContext,
        bills,
        subscriptions,
        income,
        dismissedIds: dismissedRecurringIds,
      }),
    [transactionsForContext, bills, subscriptions, income, dismissedRecurringIds],
  );

  const connectedInstitutions = useMemo((): ConnectedInstitutionDisplay[] => {
    const mergeAccountCounts = (
      institutions: ConnectedInstitutionDisplay[],
    ): ConnectedInstitutionDisplay[] =>
      institutions.map((inst) => {
        const actualCount = linkedAccounts.filter(
          (a) =>
            a.institution.toLowerCase() === inst.institutionName.toLowerCase() &&
            a.source === inst.source,
        ).length;
        return actualCount > inst.accountCount
          ? { ...inst, accountCount: actualCount }
          : inst;
      });

    const fromSplit = mergeAccountCounts([
      ...liveInstitutions,
      ...sandboxInstitutions,
    ]);
    if (fromSplit.length > 0) return fromSplit;
    if (apiInstitutions.length > 0) return apiInstitutions;
    if (!plaidConnected || linkedAccounts.length === 0) return [];
    const byInstitution = new Map<string, typeof linkedAccounts>();
    for (const account of linkedAccounts) {
      const key = account.institution || "Connected bank";
      const list = byInstitution.get(key) ?? [];
      list.push(account);
      byInstitution.set(key, list);
    }
    return [...byInstitution.entries()].map(([institutionName, accounts], i) => {
      const source =
        accounts[0]?.source === "plaid_live" ? "plaid_live" : "plaid_sandbox";
      return {
        id: `inst-${i}-${institutionName}`,
        institutionName,
        accountCount: accounts.length,
        status: "connected" as const,
        connectedAt: lastSyncAt ?? new Date().toISOString(),
        lastSyncAt,
        source,
        environment: source === "plaid_live" ? "production" : "sandbox",
      };
    });
  }, [liveInstitutions, sandboxInstitutions, apiInstitutions, plaidConnected, linkedAccounts, lastSyncAt]);

  const incomeSummary = useMemo(
    () =>
      computeIncomeSummary(
        income,
        storedMode,
        plaidConnected,
        transactionsForContext,
        manualEmpty,
        activePlaidEnvironment,
      ),
    [income, storedMode, plaidConnected, transactionsForContext, manualEmpty, activePlaidEnvironment],
  );

  const spendingSummary = useMemo(
    () =>
      computeSpendingSummary(
        transactionsForContext,
        storedMode,
        plaidConnected,
        manualEmpty,
        activePlaidEnvironment,
      ),
    [transactionsForContext, storedMode, plaidConnected, manualEmpty, activePlaidEnvironment],
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
        transactions: transactionsForContext,
        activePlaidEnvironment,
      }),
    [
      accounts,
      bills,
      income,
      subscriptions,
      storedAlerts,
      storedMode,
      plaidConnected,
      transactionsForContext,
      activePlaidEnvironment,
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
        transactions: transactionsForContext,
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
      transactionsForContext,
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
      plaidEnv,
      busy,
      error,
      storedMode,
      effectiveMode,
      modeLabel,
      dataSource,
      dataSourceBadge: dataSourceBadgeText(
        storedMode,
        plaidConnected,
        manualEmpty,
        activePlaidEnvironment,
      ),
      isManualEmpty: manualEmpty,
      plaidConnectionStatus,
      activePlaidEnvironment,
      lastSyncAt,
      lastBalanceRefreshAt,
      balanceRefreshQuota,
      livePlaidEnabled,
      liveUserAllowed,
      sandboxConnectAvailable,
      sandboxConnected,
      liveConnected,
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
      sandboxInstitutions,
      liveInstitutions,
      plaidConnected,
      plaidStorageMode,
      encryptionConfigured,
      persistentPlaidEnabled,
      devOnlyPlaidWarning,
      handleLinkSuccess,
      syncTransactions,
      refreshBalances,
      loadBalanceRefreshQuota,
      disconnectPlaid,
      disconnectSandbox,
      refreshData,
      submitTransactionReview,
    }),
    [
      loading,
      configured,
      plaidEnv,
      busy,
      error,
      storedMode,
      effectiveMode,
      modeLabel,
      dataSource,
      manualEmpty,
      plaidConnectionStatus,
      activePlaidEnvironment,
      lastSyncAt,
      lastBalanceRefreshAt,
      balanceRefreshQuota,
      livePlaidEnabled,
      liveUserAllowed,
      sandboxConnectAvailable,
      sandboxConnected,
      liveConnected,
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
      sandboxInstitutions,
      liveInstitutions,
      plaidConnected,
      plaidStorageMode,
      encryptionConfigured,
      persistentPlaidEnabled,
      devOnlyPlaidWarning,
      handleLinkSuccess,
      syncTransactions,
      refreshBalances,
      loadBalanceRefreshQuota,
      disconnectPlaid,
      disconnectSandbox,
      refreshData,
      submitTransactionReview,
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
      fd.dataSource === "plaid_live"
        ? ("plaid_live" as const)
        : fd.dataSource === "plaid_sandbox"
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
