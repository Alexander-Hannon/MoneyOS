"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Alert,
  AlertStatus,
  Bill,
  BillStatus,
  IncomeSource,
  Subscription,
  SubscriptionStatus,
} from "@/types/money";
import { mockBills } from "@/lib/data/mock-bills";
import { mockIncome } from "@/lib/data/mock-income";
import { mockSubscriptions } from "@/lib/data/mock-subscriptions";
import { mockAlerts } from "@/lib/data/mock-alerts";
import {
  STORAGE_KEYS,
  clearAllCollections,
  loadCollection,
  newId,
  saveCollection,
} from "@/lib/storage/local-storage";

type DraftBill = Omit<Bill, "id">;
type DraftIncome = Omit<IncomeSource, "id">;
type DraftSubscription = Omit<Subscription, "id">;
type DraftAlert = Omit<Alert, "id" | "status">;

interface MoneyDataContextValue {
  hydrated: boolean;
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];

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

  resetAll: () => void;
}

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

export function MoneyDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [bills, setBills] = useState<Bill[]>(mockBills);
  const [income, setIncome] = useState<IncomeSource[]>(mockIncome);
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(mockSubscriptions);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  // Load any saved edits after mount. This intentionally calls setState inside
  // an effect so the SSR/first-client render uses defaults (no hydration
  // mismatch) and localStorage data is applied right after mount.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setBills(loadCollection(STORAGE_KEYS.bills, mockBills));
    setIncome(loadCollection(STORAGE_KEYS.income, mockIncome));
    setSubscriptions(
      loadCollection(STORAGE_KEYS.subscriptions, mockSubscriptions),
    );
    setAlerts(loadCollection(STORAGE_KEYS.alerts, mockAlerts));
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

  const value: MoneyDataContextValue = {
    hydrated,
    bills,
    income,
    subscriptions,
    alerts,

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
      commitAlerts(
        alerts.map((a) => (a.id === id ? { ...a, ...draft } : a)),
      ),
    setAlertStatus: (id, status) =>
      commitAlerts(alerts.map((a) => (a.id === id ? { ...a, status } : a))),
    deleteAlert: (id) => commitAlerts(alerts.filter((a) => a.id !== id)),

    resetAll: () => {
      clearAllCollections();
      setBills(mockBills);
      setIncome(mockIncome);
      setSubscriptions(mockSubscriptions);
      setAlerts(mockAlerts);
    },
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
