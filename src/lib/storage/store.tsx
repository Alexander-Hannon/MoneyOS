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

export type UserDataExport = {
  version: 1;
  exportedAt: string;
  appMode: AppMode;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
};

interface MoneyDataContextValue {
  hydrated: boolean;
  appMode: AppMode;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];

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

export function MoneyDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [appMode, setAppModeState] = useState<AppMode>("local_user");
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<IncomeSource[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [spendingLater, setSpendingLater] =
    useState<PlannedExpense[]>(emptySpendingLater);

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

  const applyAll = useCallback(
    (mode: AppMode, data: ReturnType<typeof getDefaultsForMode>) => {
      setAppModeState(mode);
      setBills(data.bills);
      setIncome(data.income);
      setSubscriptions(data.subscriptions);
      setAlerts(data.alerts);
      setSpendingLater(data.spendingLater);
      persistMode(mode, data);
    },
    [],
  );

  const applyModeData = useCallback(
    (mode: AppMode) => applyAll(mode, getDefaultsForMode(mode)),
    [applyAll],
  );

  const startFresh = useCallback(() => {
    applyModeData("local_user");
    saveBoolean(STORAGE_KEYS.onboardingCompleted, true);
  }, [applyModeData]);

  const loadDemoData = useCallback(() => {
    applyModeData("demo");
    saveBoolean(STORAGE_KEYS.onboardingCompleted, true);
  }, [applyModeData]);

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
    };
  }, [appMode, bills, income, subscriptions, alerts, spendingLater]);

  const importData = useCallback(
    (bundle: UserDataExport) => {
      const mode = bundle.appMode ?? "local_user";
      applyAll(mode, {
        bills: bundle.bills ?? [],
        income: bundle.income ?? [],
        subscriptions: bundle.subscriptions ?? [],
        alerts: bundle.alerts ?? [],
        spendingLater: bundle.spendingLater ?? [],
      });
    },
    [applyAll],
  );

  const value: MoneyDataContextValue = {
    hydrated,
    appMode,
    bills,
    income,
    subscriptions,
    alerts,
    spendingLater,

    addBill: (draft) => commitBills([...bills, { ...draft, id: newId("bill") }]),
    updateBill: (id, draft) =>
      commitBills(bills.map((b) => (b.id === id ? { ...draft, id } : b))),
    deleteBill: (id) => commitBills(bills.filter((b) => b.id !== id)),
    setBillStatus: (id, status) =>
      commitBills(bills.map((b) => (b.id === id ? { ...b, status } : b))),

    addIncome: (draft) =>
      commitIncome([...income, { ...draft, id: newId("income") }]),
    updateIncome: (id, draft) =>
      commitIncome(income.map((i) => (i.id === id ? { ...draft, id } : i))),
    deleteIncome: (id) => commitIncome(income.filter((i) => i.id !== id)),
    toggleIncomeActive: (id) =>
      commitIncome(
        income.map((i) => (i.id === id ? { ...i, active: !i.active } : i)),
      ),

    addSubscription: (draft) =>
      commitSubscriptions([...subscriptions, { ...draft, id: newId("sub") }]),
    updateSubscription: (id, draft) =>
      commitSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...draft, id } : s)),
      ),
    deleteSubscription: (id) =>
      commitSubscriptions(subscriptions.filter((s) => s.id !== id)),
    setSubscriptionStatus: (id, status) =>
      commitSubscriptions(
        subscriptions.map((s) => (s.id === id ? { ...s, status } : s)),
      ),

    addAlert: (draft) =>
      commitAlerts([
        { ...draft, id: newId("alert"), status: "active" },
        ...alerts,
      ]),
    updateAlert: (id, draft) =>
      commitAlerts(alerts.map((a) => (a.id === id ? { ...a, ...draft } : a))),
    setAlertStatus: (id, status) =>
      commitAlerts(alerts.map((a) => (a.id === id ? { ...a, status } : a))),
    deleteAlert: (id) => commitAlerts(alerts.filter((a) => a.id !== id)),

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
