"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { cashDataSourceLabel } from "@/lib/cash-breakdown";
import { computeRunway, runwayRiskLevel } from "@/lib/runway";

export const RUNWAY_HORIZONS = [14, 30, 60, 90] as const;
export type RunwayHorizon = (typeof RUNWAY_HORIZONS)[number];

/*
 * Horizon and buffer are per-viewer display preferences, so they live in
 * localStorage. Nothing financial is stored here.
 */
const PREFS_KEY = "moneyos.runway.prefs.v1";

type RunwayPrefs = { horizon: RunwayHorizon; buffer: number };
const DEFAULT_PREFS: RunwayPrefs = { horizon: 30, buffer: 0 };

function readPrefs(): RunwayPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<RunwayPrefs>;
    const horizon = RUNWAY_HORIZONS.includes(parsed.horizon as RunwayHorizon)
      ? (parsed.horizon as RunwayHorizon)
      : DEFAULT_PREFS.horizon;
    const buffer =
      typeof parsed.buffer === "number" && Number.isFinite(parsed.buffer) && parsed.buffer >= 0
        ? parsed.buffer
        : DEFAULT_PREFS.buffer;
    return { horizon, buffer };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(prefs: RunwayPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preference only — safe to drop.
  }
}

export function useRunway(override?: { horizon?: RunwayHorizon }) {
  const fd = useFinancialData();
  const [prefs, setPrefs] = useState<RunwayPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    // Hydrate saved prefs after mount so server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(readPrefs());
  }, []);

  const update = useCallback((patch: Partial<RunwayPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
  }, []);

  const horizon = override?.horizon ?? prefs.horizon;
  const { cashDataSource, cashAvailable } = fd.dashboardSummary;
  const hasStartingBalance = cashDataSource !== "missing";

  const result = useMemo(
    () =>
      computeRunway({
        startingBalance: hasStartingBalance ? cashAvailable : 0,
        bills: fd.bills,
        income: fd.income,
        subscriptions: fd.subscriptions,
        plannedExpenses: fd.spendingLater,
        horizonDays: horizon,
        buffer: prefs.buffer,
      }),
    [
      hasStartingBalance,
      cashAvailable,
      fd.bills,
      fd.income,
      fd.subscriptions,
      fd.spendingLater,
      horizon,
      prefs.buffer,
    ],
  );

  return {
    result,
    risk: runwayRiskLevel(result),
    horizon,
    buffer: prefs.buffer,
    setHorizon: (h: RunwayHorizon) => update({ horizon: h }),
    setBuffer: (b: number) => update({ buffer: Math.max(0, b) }),
    hasStartingBalance,
    startingBalanceLabel: cashDataSourceLabel(cashDataSource),
    loading: fd.loading,
  };
}
