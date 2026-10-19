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
  | "loading"
  | "error"
  | "ready";

const SOURCE_NAMES: Record<string, string> = {
  plaid_live: "Personal Live",
  plaid_sandbox: "Plaid Sandbox",
  manual: "Manual",
};

export function useBalanceHistory() {
  const fd = useFinancialData();
  const { status } = useUserStatus();
  const bankEnvironment = fd.plaidConnected ? fd.activePlaidEnvironment : null;
  // Manual balances are real data; they never mix with Sandbox.
  const manualAllowed = bankEnvironment !== "sandbox";
  const [includeManual, setIncludeManual] = useState(true);
  const environment = bankEnvironment ?? "none";
  const requestKey = `${environment}:${manualAllowed && includeManual}`;

  const [raw, setRaw] = useState<{
    key: string;
    accounts: HistoryAccount[];
    snapshots: HistorySnapshot[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canFetch = status.signedIn && status.databaseConfigured;

  const load = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        environment,
        includeManual: String(manualAllowed && includeManual),
        days: "730",
      });
      const res = await fetch(`/api/user/balance-history?${params}`);
      const body = await res.json();
      if (!res.ok || body.ok === false) {
        throw new Error(body.message ?? "Balance history could not be loaded.");
      }
      setRaw({ key: requestKey, accounts: body.accounts, snapshots: body.snapshots });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Balance history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [canFetch, environment, manualAllowed, includeManual, requestKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch history when the requested sources change
    void load();
  }, [load]);

  // Ignore a response for sources other than the ones now requested.
  const current = raw && raw.key === requestKey ? raw : null;
  const history = useMemo(
    () => buildBalanceHistory(current?.accounts ?? [], current?.snapshots ?? []),
    [current],
  );

  // Label from the sources actually present, so it never over-claims.
  const presentSources = [...new Set((current?.accounts ?? []).map((a) => a.source ?? ""))]
    .filter(Boolean)
    .sort((a, b) => (a === "manual" ? 1 : b === "manual" ? -1 : 0));
  const sourceLabel =
    presentSources.map((s) => SOURCE_NAMES[s] ?? s).join(" + ") ||
    (bankEnvironment === "production" ? "Personal Live" : bankEnvironment === "sandbox" ? "Plaid Sandbox" : "Manual");

  let state: BalanceHistoryState;
  if (!status.signedIn) state = "signed_out";
  else if (!status.databaseConfigured) state = "no_database";
  else if (error) state = "error";
  else if (loading || !current) state = "loading";
  else state = "ready";

  return {
    state,
    error,
    history,
    bankEnvironment,
    sourceLabel,
    manualAllowed,
    includeManual: manualAllowed && includeManual,
    setIncludeManual,
    reload: load,
  };
}
