"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LinkedAccount, MoneyTransaction } from "@/types/transactions";

export type DataSource = "mock" | "plaid_sandbox";
export type ConnectionStatus = "not_connected" | "connected" | "error";

interface PlaidContextValue {
  loading: boolean;
  configured: boolean;
  status: ConnectionStatus;
  source: DataSource;
  accounts: LinkedAccount[];
  transactions: MoneyTransaction[];
  lastSyncAt: string | null;
  busy: boolean;
  error: string | null;
  /** Called by Plaid Link onSuccess with the public_token. */
  handleLinkSuccess: (publicToken: string) => Promise<void>;
  /** Re-fetch accounts + transactions from the sandbox. */
  syncNow: () => Promise<void>;
}

const PlaidContext = createContext<PlaidContextValue | null>(null);

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export function PlaidProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("not_connected");
  const [source, setSource] = useState<DataSource>("mock");
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSandboxData = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const accountsRes = await postJson("/api/plaid/accounts");
      if (accountsRes.error) throw new Error(accountsRes.error);
      if (Array.isArray(accountsRes.accounts)) setAccounts(accountsRes.accounts);

      const txnRes = await postJson("/api/plaid/sync-transactions");
      if (txnRes.error) throw new Error(txnRes.error);
      if (Array.isArray(txnRes.transactions)) {
        setTransactions(txnRes.transactions);
        setSource("plaid_sandbox");
        setStatus("connected");
        if (txnRes.lastSyncAt) setLastSyncAt(txnRes.lastSyncAt);
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not load sandbox data.");
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/status").then((r) => r.json());
      setConfigured(Boolean(res.configured));
      setLastSyncAt(res.lastSyncAt ?? null);
      if (res.connected) {
        setStatus("connected");
        setSource("plaid_sandbox");
        await loadSandboxData();
      } else {
        setStatus("not_connected");
        setSource("mock");
      }
    } catch {
      setError("Could not reach the Plaid status endpoint.");
    } finally {
      setLoading(false);
    }
  }, [loadSandboxData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStatus();
  }, [refreshStatus]);

  const handleLinkSuccess = useCallback(
    async (publicToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await postJson("/api/plaid/exchange-public-token", {
          public_token: publicToken,
        });
        if (res.configured === false) {
          setError("Plaid is not configured.");
          return;
        }
        if (res.error) throw new Error(res.error);
        await loadSandboxData();
      } catch (e) {
        setStatus("error");
        setError(
          e instanceof Error ? e.message : "Could not connect the sandbox bank.",
        );
      } finally {
        setBusy(false);
      }
    },
    [loadSandboxData],
  );

  const syncNow = useCallback(async () => {
    await loadSandboxData();
  }, [loadSandboxData]);

  return (
    <PlaidContext.Provider
      value={{
        loading,
        configured,
        status,
        source,
        accounts,
        transactions,
        lastSyncAt,
        busy,
        error,
        handleLinkSuccess,
        syncNow,
      }}
    >
      {children}
    </PlaidContext.Provider>
  );
}

export function usePlaid(): PlaidContextValue {
  const ctx = useContext(PlaidContext);
  if (!ctx) throw new Error("usePlaid must be used within a PlaidProvider");
  return ctx;
}
