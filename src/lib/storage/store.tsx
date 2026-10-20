"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
import { inferNextIncomeDate } from "@/lib/money-utils";
import { getBillNextDueDate, getIncomeNextDate, getSubscriptionNextRenewalDate } from "@/lib/recurrence";
import { normalizeFinancialDataBundle } from "@/lib/date-normalization";
import { newId } from "@/lib/storage/local-storage";
import { diffRecords, isEmptyDiff } from "@/lib/storage/record-diff";
import { EMPTY_PREFERENCES, sanitizePreferences, type UserPreferences } from "@/lib/preferences";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/components/ui/toast";

/*
 * MoneyOS data store.
 *  - Signed in ("account"): the database is canonical. State loads from the
 *    server and every change writes only the changed records.
 *  - Signed out ("preview"): read-only-in-spirit demo data held in memory;
 *    nothing is persisted anywhere.
 */

type DraftBill = Omit<Bill, "id">;
type DraftIncome = Omit<IncomeSource, "id">;
type DraftSubscription = Omit<Subscription, "id">;
type DraftAlert = Omit<Alert, "id" | "status">;
type DraftAccount = Omit<Account, "id" | "createdAt" | "updatedAt">;
type DraftSpendingLater = Omit<PlannedExpense, "id">;

export type DataMode = "loading" | "account" | "preview";

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

type Collections = {
  bills: Bill[];
  income: IncomeSource[];
  subscriptions: Subscription[];
  alerts: Alert[];
  spendingLater: PlannedExpense[];
  manualAccounts: Account[];
};
type CollectionKey = keyof Collections;

const EMPTY: Collections = {
  bills: [],
  income: [],
  subscriptions: [],
  alerts: [],
  spendingLater: [],
  manualAccounts: [],
};

const MAX_PER_REQUEST = 200;
const FOCUS_RELOAD_MS = 30_000;

interface MoneyDataContextValue extends Collections {
  hydrated: boolean;
  dataMode: DataMode;
  appMode: AppMode;
  /** Set when the account data couldn't load. */
  loadError: string | null;
  saving: boolean;
  reload: () => Promise<void>;

  addBill: (draft: DraftBill) => void;
  updateBill: (id: string, draft: DraftBill) => void;
  deleteBill: (id: string) => void;
  setBillStatus: (id: string, status: BillStatus) => void;
  markBillPaid: (id: string) => void;
  markBillScheduled: (id: string) => void;

  addIncome: (draft: DraftIncome) => void;
  updateIncome: (id: string, draft: DraftIncome) => void;
  deleteIncome: (id: string) => void;
  toggleIncomeActive: (id: string) => void;
  markIncomeReceived: (id: string) => void;

  addSubscription: (draft: DraftSubscription) => void;
  updateSubscription: (id: string, draft: DraftSubscription) => void;
  deleteSubscription: (id: string) => void;
  setSubscriptionStatus: (id: string, status: SubscriptionStatus) => void;
  markSubscriptionRenewed: (id: string) => void;

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

  exportData: () => UserDataExport;
  /** Adds or updates records from an export file. Never deletes. */
  importData: (bundle: UserDataExport) => void;
}

const MoneyDataContext = createContext<MoneyDataContextValue | null>(null);

function normalizeBillDraft(draft: DraftBill): DraftBill {
  if (draft.status === "paid") {
    const occurrenceDate = getBillNextDueDate({ ...draft, id: "temp" });
    return { ...draft, lastPaidAt: occurrenceDate, scheduledForDate: undefined, status: "unpaid" };
  }
  if (draft.status === "scheduled") {
    const occurrenceDate = getBillNextDueDate({ ...draft, id: "temp" });
    return { ...draft, scheduledForDate: occurrenceDate };
  }
  return draft;
}

function normalizeIncomeDraft(draft: DraftIncome): DraftIncome {
  return { ...draft, nextDate: draft.nextDate ?? inferNextIncomeDate({ ...draft, id: "temp" }) };
}

function previewCollections(): Collections {
  const demo = getDefaultsForMode("demo");
  return { ...demo, manualAccounts: [] };
}

function collectionsFromBundle(data: Partial<UserDataExport>): Collections {
  const normalized = normalizeFinancialDataBundle({
    bills: data.bills ?? [],
    income: data.income ?? [],
    subscriptions: data.subscriptions ?? [],
  });
  return {
    bills: normalized.bills ?? [],
    income: normalized.income ?? [],
    subscriptions: normalized.subscriptions ?? [],
    alerts: data.alerts ?? [],
    spendingLater: data.spendingLater ?? [],
    manualAccounts: data.manualAccounts ?? [],
  };
}

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message ?? "Could not save your changes.");
  }
  return data;
}

export function MoneyDataProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const toast = useToast();
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [data, setData] = useState<Collections>(EMPTY);
  const [prefs, setPrefs] = useState<UserPreferences>(EMPTY_PREFERENCES);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const dataRef = useRef<Collections>(EMPTY);
  const prefsRef = useRef<UserPreferences>(EMPTY_PREFERENCES);
  const modeRef = useRef<DataMode>("loading");
  const queues = useRef<Partial<Record<string, Promise<void>>>>({});

  const setAll = useCallback((next: Collections, nextPrefs: UserPreferences) => {
    dataRef.current = next;
    prefsRef.current = nextPrefs;
    setData(next);
    setPrefs(nextPrefs);
  }, []);

  const loadAccount = useCallback(async () => {
    try {
      const [bundleRes, prefsRes] = await Promise.all([
        fetch("/api/user/sync").then((r) => r.json()),
        fetch("/api/user/preferences").then((r) => r.json()),
      ]);
      if (bundleRes.ok === false) throw new Error(bundleRes.message ?? "Could not load your data.");
      setAll(
        collectionsFromBundle(bundleRes.data ?? {}),
        sanitizePreferences(prefsRes.ok === false ? null : prefsRes.preferences),
      );
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load your data.");
    }
  }, [setAll]);

  useEffect(() => {
    if (session.loading) return;
    let cancelled = false;
    async function start() {
      if (session.accountBacked) {
        await loadAccount();
        if (cancelled) return;
        modeRef.current = "account";
        setDataMode("account");
      } else {
        setAll(previewCollections(), EMPTY_PREFERENCES);
        modeRef.current = "preview";
        setDataMode("preview");
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [session.loading, session.accountBacked, loadAccount, setAll]);

  // Pick up changes made on other devices when this tab regains focus.
  const lastLoadRef = useRef(0);
  const pendingRef = useRef(0);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(() => {
    if (dataMode !== "account") return;
    lastLoadRef.current = Date.now();
    const onFocus = () => {
      if (pendingRef.current > 0) return;
      if (Date.now() - lastLoadRef.current < FOCUS_RELOAD_MS) return;
      lastLoadRef.current = Date.now();
      void loadAccount();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dataMode, loadAccount]);

  /** Serialize writes per collection so edits land in order. */
  const enqueue = useCallback((key: string, task: () => Promise<void>) => {
    const previous = queues.current[key] ?? Promise.resolve();
    const next = previous.then(task, task);
    queues.current[key] = next;
    return next;
  }, []);

  const handleSaveFailure = useCallback(
    async (error: unknown) => {
      toast(error instanceof Error ? error.message : "Could not save your changes.");
      // The server is canonical — reload it rather than guess at a rollback.
      await loadAccount();
    },
    [loadAccount, toast],
  );

  const update = useCallback(
    <K extends CollectionKey>(key: K, fn: (current: Collections[K]) => Collections[K]) => {
      const prev = dataRef.current[key];
      const next = fn(prev);
      if (next === prev) return;
      dataRef.current = { ...dataRef.current, [key]: next };
      setData(dataRef.current);
      if (modeRef.current !== "account") return;

      const diff = diffRecords(prev as { id: string }[], next as { id: string }[]);
      if (isEmptyDiff(diff)) return;
      setPending((n) => n + 1);
      void enqueue(key, async () => {
        try {
          for (let i = 0; i < Math.max(diff.upserts.length, diff.deletes.length); i += MAX_PER_REQUEST) {
            await postJson("/api/user/records", {
              entity: key,
              upserts: diff.upserts.slice(i, i + MAX_PER_REQUEST),
              deletes: diff.deletes.slice(i, i + MAX_PER_REQUEST),
            });
          }
        } catch (error) {
          await handleSaveFailure(error);
        } finally {
          setPending((n) => n - 1);
        }
      });
    },
    [enqueue, handleSaveFailure],
  );

  const updatePrefs = useCallback(
    (fn: (current: UserPreferences) => UserPreferences) => {
      const next = fn(prefsRef.current);
      if (next === prefsRef.current) return;
      prefsRef.current = next;
      setPrefs(next);
      if (modeRef.current !== "account") return;
      setPending((n) => n + 1);
      void enqueue("preferences", async () => {
        try {
          await postJson("/api/user/preferences", prefsRef.current, "PUT");
        } catch (error) {
          await handleSaveFailure(error);
        } finally {
          setPending((n) => n - 1);
        }
      });
    },
    [enqueue, handleSaveFailure],
  );

  const mapOne = <T extends { id: string }>(list: T[], id: string, fn: (item: T) => T): T[] =>
    list.map((item) => (item.id === id ? fn(item) : item));

  const appMode: AppMode = dataMode === "preview" ? "demo" : "local_user";

  const exportData = useCallback(
    (): UserDataExport => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      appMode,
      ...dataRef.current,
    }),
    [appMode],
  );

  const importData = useCallback(
    (bundle: UserDataExport) => {
      const incoming = collectionsFromBundle(bundle);
      (Object.keys(incoming) as CollectionKey[]).forEach((key) => {
        update(key, (current) => {
          const byId = new Map((current as { id: string }[]).map((r) => [r.id, r]));
          for (const r of incoming[key] as { id: string }[]) byId.set(r.id, r);
          return [...byId.values()] as Collections[typeof key];
        });
      });
    },
    [update],
  );

  const value: MoneyDataContextValue = {
    hydrated: dataMode !== "loading",
    dataMode,
    appMode,
    loadError,
    saving: pending > 0,
    reload: loadAccount,
    ...data,

    addBill: (draft) => update("bills", (l) => [...l, { ...normalizeBillDraft(draft), id: newId("bill") }]),
    updateBill: (id, draft) => update("bills", (l) => mapOne(l, id, () => ({ ...normalizeBillDraft(draft), id }))),
    deleteBill: (id) => update("bills", (l) => l.filter((b) => b.id !== id)),
    setBillStatus: (id, status) =>
      update("bills", (l) =>
        mapOne(l, id, (b) => {
          if (status === "paid") {
            return { ...b, status: "unpaid", lastPaidAt: getBillNextDueDate(b), scheduledForDate: undefined };
          }
          if (status === "scheduled") return { ...b, status, scheduledForDate: getBillNextDueDate(b) };
          return { ...b, status, scheduledForDate: undefined };
        }),
      ),
    markBillPaid: (id) =>
      update("bills", (l) =>
        mapOne(l, id, (b) => ({ ...b, status: "unpaid", lastPaidAt: getBillNextDueDate(b), scheduledForDate: undefined })),
      ),
    markBillScheduled: (id) =>
      update("bills", (l) => mapOne(l, id, (b) => ({ ...b, status: "scheduled", scheduledForDate: getBillNextDueDate(b) }))),

    addIncome: (draft) => update("income", (l) => [...l, { ...normalizeIncomeDraft(draft), id: newId("income") }]),
    updateIncome: (id, draft) => update("income", (l) => mapOne(l, id, () => ({ ...normalizeIncomeDraft(draft), id }))),
    deleteIncome: (id) => update("income", (l) => l.filter((i) => i.id !== id)),
    toggleIncomeActive: (id) => update("income", (l) => mapOne(l, id, (i) => ({ ...i, active: !i.active }))),
    markIncomeReceived: (id) =>
      update("income", (l) =>
        mapOne(l, id, (i) => {
          const occurrenceDate = getIncomeNextDate(i) ?? i.nextDate;
          return occurrenceDate ? { ...i, lastReceivedAt: occurrenceDate } : i;
        }),
      ),

    addSubscription: (draft) => update("subscriptions", (l) => [...l, { ...draft, id: newId("sub") }]),
    updateSubscription: (id, draft) => update("subscriptions", (l) => mapOne(l, id, () => ({ ...draft, id }))),
    deleteSubscription: (id) => update("subscriptions", (l) => l.filter((s) => s.id !== id)),
    setSubscriptionStatus: (id, status) => update("subscriptions", (l) => mapOne(l, id, (s) => ({ ...s, status }))),
    markSubscriptionRenewed: (id) =>
      update("subscriptions", (l) =>
        mapOne(l, id, (s) => {
          const occurrenceDate = getSubscriptionNextRenewalDate(s) ?? s.renewalDate;
          return occurrenceDate ? { ...s, lastRenewedAt: occurrenceDate } : s;
        }),
      ),

    addAlert: (draft) =>
      update("alerts", (l) => [{ ...draft, id: newId("alert"), status: "active", userCreated: true }, ...l]),
    updateAlert: (id, draft) => update("alerts", (l) => mapOne(l, id, (a) => ({ ...a, ...draft }))),
    setAlertStatus: (id, status) => update("alerts", (l) => mapOne(l, id, (a) => ({ ...a, status }))),
    deleteAlert: (id) => update("alerts", (l) => l.filter((a) => a.id !== id)),
    replaceAlerts: (alerts) => update("alerts", () => alerts),

    addSpendingLater: (draft) =>
      update("spendingLater", (l) => [...l, { ...draft, id: newId("spend-later"), title: draft.title ?? draft.name }]),
    updateSpendingLater: (id, draft) =>
      update("spendingLater", (l) => mapOne(l, id, () => ({ ...draft, id, title: draft.title ?? draft.name }))),
    deleteSpendingLater: (id) => update("spendingLater", (l) => l.filter((item) => item.id !== id)),

    dismissRecurringSuggestion: (id) =>
      updatePrefs((p) =>
        p.dismissedRecurringIds.includes(id) ? p : { ...p, dismissedRecurringIds: [...p.dismissedRecurringIds, id] },
      ),
    dismissActionItem: (id) =>
      updatePrefs((p) =>
        p.dismissedActionIds.includes(id) ? p : { ...p, dismissedActionIds: [...p.dismissedActionIds, id] },
      ),
    dismissedRecurringIds: prefs.dismissedRecurringIds,
    dismissedActionIds: prefs.dismissedActionIds,

    addManualAccount: (draft) => {
      const now = new Date().toISOString();
      update("manualAccounts", (l) => [
        ...l,
        { ...draft, id: newId("acct"), source: "manual" as const, createdAt: now, updatedAt: now },
      ]);
    },
    updateManualAccount: (id, draft) => {
      const now = new Date().toISOString();
      update("manualAccounts", (l) => mapOne(l, id, () => ({ ...draft, id, source: "manual" as const, updatedAt: now })));
    },
    deleteManualAccount: (id) => update("manualAccounts", (l) => l.filter((a) => a.id !== id)),

    exportData,
    importData,
  };

  return <MoneyDataContext.Provider value={value}>{children}</MoneyDataContext.Provider>;
}

export function useMoneyData(): MoneyDataContextValue {
  const ctx = useContext(MoneyDataContext);
  if (!ctx) {
    throw new Error("useMoneyData must be used within a MoneyDataProvider");
  }
  return ctx;
}
