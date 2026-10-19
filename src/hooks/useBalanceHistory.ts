"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import {
  buildBalanceHistory,
  type HistoryAccount,
  type HistorySnapshot,
} from "@/lib/balance-history";

export type BalanceHistoryState =
  | "signed_out"
  | "no_database"
  | "no_bank"
  | "loading"
  | "error"
  | "ready";

export function useBalanceHistory() {
  const fd = useFinancialData();
  const { status } = useUserStatus();
  const environment = fd.plaidConnected ? fd.activePlaidEnvironment : null;

  const [raw, setRaw] = useState<{
    environment: string;
    accounts: HistoryAccount[];
    snapshots: HistorySnapshot[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canFetch = status.signedIn && status.databaseConfigured && environment != null;

  const load = useCallback(async () => {
    if (!canFetch || !environment) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/balance-history?environment=${environment}&days=730`);
      const body = await res.json();
      if (!res.ok || body.ok === false) {
        throw new Error(body.message ?? "Balance history could not be loaded.");
      }
      setRaw({ environment, accounts: body.accounts, snapshots: body.snapshots });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [canFetch, environment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch history when the active environment changes
    void load();
  }, [load]);

  // Ignore a response for a different environment than the one now active.
  const current = raw && raw.environment === environment ? raw : null;
  const history = useMemo(
    () => buildBalanceHistory(current?.accounts ?? [], current?.snapshots ?? []),
    [current],
  );

  let state: BalanceHistoryState;
  if (!status.signedIn) state = "signed_out";
  else if (!status.databaseConfigured) state = "no_database";
  else if (!environment) state = "no_bank";
  else if (error) state = "error";
  else if (loading || !current) state = "loading";
  else state = "ready";

  return {
    state,
    error,
    history,
    environment,
    sourceLabel: environment === "production" ? "Personal Live" : "Plaid Sandbox",
    reload: load,
  };
}
