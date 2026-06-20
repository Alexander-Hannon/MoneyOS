"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppMode } from "@/types/app-mode";
import type {
  Alert,
  AlertStatus,
  Account,
  Bill,
  BillStatus,
  IncomeSource,
  PlannedExpense,
  Subscription,
  SubscriptionStatus,
} from "@/types/money";
import { getDefaultsForMode } from "@/lib/app-mode";
import {
  emptySpendingLater,
} from "@/lib/data/empty-user-data";
import { inferNextIncomeDate } from "@/lib/money-utils";
import {
  STORAGE_KEYS,
  loadAppModeFromStorage,
  loadCollection,
  newId,
  saveAppModeToStorage,
  saveBoolean,
  saveCollection,
} from "@/lib/storage/local-storage";

type DraftBill = Omit<Bill, "id">;
type DraftIncome = Omit<IncomeSource, "id">;
type DraftSubscription = Omit<Subscription, "id">;
type DraftAlert = Omit<Alert, "id" | "status">;
type DraftAccount = Omit<Account, "id" | "createdAt" | "updatedAt">;
type DraftSpendingLater = Omit<PlannedExpense, "id">;

export type UserDataExport = {
  version: 1;
  exportedAt: string;
  appMode: AppMode;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
  manualAccounts?: Account[];
};

interface MoneyDataContextValue {
  hydrated: boolean;
  /** Increments on user CRUD edits — not on importData / account pull. */
  userEditGeneration: number;
  appMode: AppMode;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
  manualAccounts: Account[];

  addBill: (draft: DraftBill) => void;
  updateBill: (id: string, draft: DraftBill) => void;
  deleteBill: (id: string) => void;
  setBillStatus: (id: string, status: BillStatus) => void;

  addIncome: (draft: DraftIncome) => void;
  updateIncome: (id: string, draft: DraftIncome) => void;
  deleteIncome: (id: string) => void;
  toggleIncomeActive: (id: string) => void;

  addSubscription: (draft: DraftSubscription) => void;
  updateSubscription: (id: string, draft: DraftSubscription) => void;
  deleteSubscription: (id: string) => void;
  setSubscriptionStatus: (id: string, status: SubscriptionStatus) => void;

  addAlert: (draft: DraftAlert) => void;
  updateAlert: (id: string, draft: DraftAlert) => void;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  deleteAlert: (id: string) => void;
  replaceAlerts: (alerts: Alert[]) => void;

  addSpendingLater: (draft: DraftSpendingLater) => void;
  updateSpendingLater: (id: string, draft: DraftSpendingLater) => void;
  deleteSpendingLater: (id: string) => void;

  dismissRecurringSuggestion: (id: string) => void;
  dismissActionItem: (id: string) => void;
  dismissedRecurringIds: string[];
  dismissedActionIds: string[];

  addManualAccount: (draft: DraftAccount) => void;
  updateManualAccount: (id: string, draft: DraftAccount) => void;
  deleteManualAccount: (id: string) => void;

  applyModeData: (mode: AppMode) => void;
  startFresh: () => void;
  loadDemoData: () => void;
  resetToModeDefaults: () => void;
  exportData: () => UserDataExport;
  importData: (bundle: UserDataExport) => void;
  setAppMode: (mode: AppMode) => void;
}

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

function persistMode(mode: AppMode, data: ReturnType<typeof getDefaultsForMode>) {
  saveAppModeToStorage(mode);
  saveCollection(STORAGE_KEYS.bills, data.bills);
  saveCollection(STORAGE_KEYS.income, data.income);
  saveCollection(STORAGE_KEYS.subscriptions, data.subscriptions);
  saveCollection(STORAGE_KEYS.alerts, data.alerts);
  saveCollection(STORAGE_KEYS.spendingLater, data.spendingLater);
}

function normalizeIncomeDraft(draft: DraftIncome): DraftIncome {
  const next = {
    ...draft,
    nextDate: draft.nextDate ?? inferNextIncomeDate({ ...draft, id: "temp" }),
  };
  return next;
}

export function MoneyDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [appMode, setAppModeState] = useState<AppMode>("local_user");
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<IncomeSource[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [spendingLater, setSpendingLater] =
    useState<PlannedExpense[]>(emptySpendingLater);
  const [manualAccounts, setManualAccounts] = useState<Account[]>([]);
  const [dismissedRecurringIds, setDismissedRecurringIds] = useState<string[]>(
    [],
  );
  const [dismissedActionIds, setDismissedActionIds] = useState<string[]>([]);
  const [userEditGeneration, setUserEditGeneration] = useState(0);

  const bumpUserEdit = useCallback(() => {
    setUserEditGeneration((generation) => generation + 1);
  }, []);

  useEffect(() => {
    const mode = loadAppModeFromStorage() ?? "local_user";
    const defaults = getDefaultsForMode(mode);
    /* eslint-disable react-hooks/set-state-in-effect */
    setAppModeState(mode);
    setBills(loadCollection(STORAGE_KEYS.bills, defaults.bills));
    setIncome(loadCollection(STORAGE_KEYS.income, defaults.income));
    setSubscriptions(
      loadCollection(STORAGE_KEYS.subscriptions, defaults.subscriptions),
    );
    setAlerts(loadCollection(STORAGE_KEYS.alerts, defaults.alerts));
    setSpendingLater(
      loadCollection(STORAGE_KEYS.spendingLater, defaults.spendingLater),
    );
    setManualAccounts(loadCollection(STORAGE_KEYS.manualAccounts, []));
    setDismissedRecurringIds(
      loadCollection(STORAGE_KEYS.dismissedRecurring, []),
    );
    setDismissedActionIds(loadCollection(STORAGE_KEYS.dismissedActions, []));
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const commitBills = useCallback((next: Bill[]) => {
    setBills(next);
    saveCollection(STORAGE_KEYS.bills, next);
  }, []);
  const commitIncome = useCallback((next: IncomeSource[]) => {
    setIncome(next);
    saveCollection(STORAGE_KEYS.income, next);
  }, []);
  const commitSubscriptions = useCallback((next: Subscription[]) => {
    setSubscriptions(next);
    saveCollection(STORAGE_KEYS.subscriptions, next);
  }, []);
  const commitAlerts = useCallback((next: Alert[]) => {
    setAlerts(next);
    saveCollection(STORAGE_KEYS.alerts, next);
  }, []);
  const commitSpendingLater = useCallback((next: PlannedExpense[]) => {
    setSpendingLater(next);
    saveCollection(STORAGE_KEYS.spendingLater, next);
  }, []);
  const commitDismissedRecurring = useCallback((next: string[]) => {
    setDismissedRecurringIds(next);
    saveCollection(STORAGE_KEYS.dismissedRecurring, next);
  }, []);
  const commitDismissedActions = useCallback((next: string[]) => {
    setDismissedActionIds(next);
    saveCollection(STORAGE_KEYS.dismissedActions, next);
  }, []);
  const commitManualAccounts = useCallback((next: Account[]) => {
    setManualAccounts(next);
    saveCollection(STORAGE_KEYS.manualAccounts, next);
  }, []);

  const applyAll = useCallback(
    (mode: AppMode, data: ReturnType<typeof getDefaultsForMode>, accounts: Account[] = []) => {
      setAppModeState(mode);
      setBills(data.bills);
      setIncome(data.income);
      setSubscriptions(data.subscriptions);
      setAlerts(data.alerts);
      setSpendingLater(data.spendingLater);
      setManualAccounts(accounts);
      persistMode(mode, data);
      saveCollection(STORAGE_KEYS.manualAccounts, accounts);
    },
    [],
  );

  const applyModeData = useCallback(
    (mode: AppMode) => {
      const accounts = mode === "local_user" ? manualAccounts : [];
      applyAll(mode, getDefaultsForMode(mode), accounts);
    },
    [applyAll, manualAccounts],
  );

  const startFresh = useCallback(() => {
    applyAll("local_user", getDefaultsForMode("local_user"), []);
    saveBoolean(STORAGE_KEYS.onboardingCompleted, true);
  }, [applyAll]);

  const loadDemoData = useCallback(() => {
    applyAll("demo", getDefaultsForMode("demo"), []);
    saveBoolean(STORAGE_KEYS.onboardingCompleted, true);
  }, [applyAll]);

  const resetToModeDefaults = useCallback(() => {
    applyModeData(appMode);
  }, [applyModeData, appMode]);

  const setAppMode = useCallback(
    (mode: AppMode) => {
      saveAppModeToStorage(mode);
      setAppModeState(mode);
    },
    [],
  );

  const exportData = useCallback((): UserDataExport => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      appMode,
      bills,
      income,
      subscriptions,
      alerts,
      spendingLater,
      manualAccounts: manualAccounts,
    };
  }, [appMode, bills, income, subscriptions, alerts, spendingLater, manualAccounts]);

  const importData = useCallback(
    (bundle: UserDataExport) => {
      const mode = bundle.appMode ?? "local_user";
      applyAll(
        mode,
        {
          bills: bundle.bills ?? [],
          income: bundle.income ?? [],
          subscriptions: bundle.subscriptions ?? [],
          alerts: bundle.alerts ?? [],
          spendingLater: bundle.spendingLater ?? [],
        },
        bundle.manualAccounts ?? [],
      );
    },
    [applyAll],
  );

  const value: MoneyDataContextValue = {
    hydrated,
    userEditGeneration,
    appMode,
    bills,
    income,
    subscriptions,
    alerts,
    spendingLater,
    manualAccounts,

    addBill: (draft) => {
      commitBills([...bills, { ...draft, id: newId("bill") }]);
      bumpUserEdit();
    },
    updateBill: (id, draft) => {
      commitBills(bills.map((b) => (b.id === id ? { ...draft, id } : b)));
      bumpUserEdit();
    },
    deleteBill: (id) => {
      commitBills(bills.filter((b) => b.id !== id));
      bumpUserEdit();
    },
    setBillStatus: (id, status) => {
      commitBills(bills.map((b) => (b.id === id ? { ...b, status } : b)));
      bumpUserEdit();
    },

    addIncome: (draft) => {
      const normalized = normalizeIncomeDraft(draft);
      commitIncome([...income, { ...normalized, id: newId("income") }]);
      bumpUserEdit();
    },
    updateIncome: (id, draft) => {
      const normalized = normalizeIncomeDraft(draft);
      commitIncome(income.map((i) => (i.id === id ? { ...normalized, id } : i)));
      bumpUserEdit();
    },
    deleteIncome: (id) => {
      commitIncome(income.filter((i) => i.id !== id));
      bumpUserEdit();
    },
    toggleIncomeActive: (id) => {
      commitIncome(
        income.map((i) => (i.id === id ? { ...i, active: !i.active } : i)),
      );
      bumpUserEdit();
    },

    addSubscription: (draft) => {
      commitSubscriptions([...subscriptions, { ...draft, id: newId("sub") }]);
      bumpUserEdit();
    },
    updateSubscription: (id, draft) => {
      commitSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...draft, id } : s)),
      );
      bumpUserEdit();
    },
    deleteSubscription: (id) => {
      commitSubscriptions(subscriptions.filter((s) => s.id !== id));
      bumpUserEdit();
    },
    setSubscriptionStatus: (id, status) => {
      commitSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...s, status } : s)),
      );
      bumpUserEdit();
    },

    addAlert: (draft) => {
      commitAlerts([
        {
          ...draft,
          id: newId("alert"),
          status: "active",
          userCreated: true,
        },
        ...alerts,
      ]);
      bumpUserEdit();
    },
    updateAlert: (id, draft) => {
      commitAlerts(alerts.map((a) => (a.id === id ? { ...a, ...draft } : a)));
      bumpUserEdit();
    },
    setAlertStatus: (id, status) => {
      commitAlerts(alerts.map((a) => (a.id === id ? { ...a, status } : a)));
      bumpUserEdit();
    },
    deleteAlert: (id) => {
      commitAlerts(alerts.filter((a) => a.id !== id));
      bumpUserEdit();
    },
    replaceAlerts: commitAlerts,

    addSpendingLater: (draft) => {
      commitSpendingLater([
        ...spendingLater,
        { ...draft, id: newId("spend-later"), title: draft.title ?? draft.name },
      ]);
      bumpUserEdit();
    },
    updateSpendingLater: (id, draft) => {
      commitSpendingLater(
        spendingLater.map((item) =>
          item.id === id
            ? { ...draft, id, title: draft.title ?? draft.name }
            : item,
        ),
      );
      bumpUserEdit();
    },
    deleteSpendingLater: (id) => {
      commitSpendingLater(spendingLater.filter((item) => item.id !== id));
      bumpUserEdit();
    },

    dismissRecurringSuggestion: (id) => {
      if (dismissedRecurringIds.includes(id)) return;
      commitDismissedRecurring([...dismissedRecurringIds, id]);
      bumpUserEdit();
    },
    dismissActionItem: (id) => {
      if (dismissedActionIds.includes(id)) return;
      commitDismissedActions([...dismissedActionIds, id]);
      bumpUserEdit();
    },
    dismissedRecurringIds,
    dismissedActionIds,

    addManualAccount: (draft) => {
      const now = new Date().toISOString();
      commitManualAccounts([
        ...manualAccounts,
        {
          ...draft,
          id: newId("acct"),
          source: "manual" as const,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      bumpUserEdit();
    },
    updateManualAccount: (id, draft) => {
      const now = new Date().toISOString();
      commitManualAccounts(
        manualAccounts.map((a) =>
          a.id === id
            ? { ...draft, id, source: "manual" as const, updatedAt: now }
            : a,
        ),
      );
      bumpUserEdit();
    },
    deleteManualAccount: (id) => {
      commitManualAccounts(manualAccounts.filter((a) => a.id !== id));
      bumpUserEdit();
    },

    applyModeData,
    startFresh,
    loadDemoData,
    resetToModeDefaults,
    exportData,
    importData,
    setAppMode,
  };

  return (
    <MoneyDataContext.Provider value={value}>
      {children}
    </MoneyDataContext.Provider>
  );
}

export function useMoneyData(): MoneyDataContextValue {
  const ctx = useContext(MoneyDataContext);
  if (!ctx) {
    throw new Error("useMoneyData must be used within a MoneyDataProvider");
  }
  return ctx;
}
