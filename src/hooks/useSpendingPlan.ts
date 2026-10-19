"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import {
  DEFAULT_PLAN_SETTINGS,
  computeSpendingPlan,
  sanitizePlanSettings,
  type SpendingPlanSettings,
} from "@/lib/spending-plan";

// Signed-out / local-only fallback. When signed in, the database is canonical.
const LOCAL_KEY = "moneyos:spending-plan";

function readLocal(): SpendingPlanSettings {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? sanitizePlanSettings(JSON.parse(raw)) : { ...DEFAULT_PLAN_SETTINGS };
  } catch {
    return { ...DEFAULT_PLAN_SETTINGS };
  }
}

function writeLocal(settings: SpendingPlanSettings) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — the in-memory plan still works for this session.
  }
}

export function useSpendingPlan() {
  const fd = useFinancialData();
  const { status } = useUserStatus();
  const useServer = status.signedIn && status.databaseConfigured;

  const [settings, setSettings] = useState<SpendingPlanSettings>(DEFAULT_PLAN_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!useServer) {
        setSettings(readLocal());
        setLoaded(true);
        return;
      }
      try {
        const res = await fetch("/api/user/spending-plan");
        const body = await res.json();
        if (!res.ok || body.ok === false) throw new Error(body.message ?? "Could not load your plan.");
        if (!cancelled) setSettings(sanitizePlanSettings(body.plan));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your plan.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [useServer]);

  const save = useCallback(
    async (next: SpendingPlanSettings) => {
      const clean = sanitizePlanSettings(next);
      const previous = settings;
      setSettings(clean);
      setError(null);
      if (!useServer) {
        writeLocal(clean);
        return true;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/user/spending-plan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clean),
        });
        const body = await res.json();
        if (!res.ok || body.ok === false) throw new Error(body.message ?? "Could not save your plan.");
        return true;
      } catch (e) {
        setSettings(previous);
        setError(e instanceof Error ? e.message : "Could not save your plan.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings, useServer],
  );

  const plan = useMemo(
    () =>
      computeSpendingPlan({
        income: fd.income,
        bills: fd.bills,
        subscriptions: fd.subscriptions,
        transactions: fd.transactions,
        settings,
      }),
    [fd.income, fd.bills, fd.subscriptions, fd.transactions, settings],
  );

  return {
    plan,
    settings,
    save,
    saving,
    error,
    loading: fd.loading || !loaded,
    syncedToAccount: useServer,
    transactionsLabel: fd.dataSourceBadge,
    hasTransactions: fd.transactions.length > 0,
  };
}
