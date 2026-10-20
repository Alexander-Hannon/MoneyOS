"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UserStatus = {
  authConfigured: boolean;
  databaseConfigured: boolean;
  encryptionConfigured: boolean;
  persistentPlaidEnabled: boolean;
  plaidStorageMode: "memory" | "database" | "none";
  signedIn: boolean;
  storageMode: "localStorage" | "database" | "mixed";
  user: { email: string | null; displayName: string | null } | null;
};

const defaultStatus: UserStatus = {
  authConfigured: false,
  databaseConfigured: false,
  encryptionConfigured: false,
  persistentPlaidEnabled: false,
  plaidStorageMode: "none",
  signedIn: false,
  storageMode: "localStorage",
  user: null,
};

type SessionContextValue = {
  status: UserStatus;
  loading: boolean;
  /** True when signed in with the database available — account data is canonical. */
  accountBacked: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function fetchStatus(): Promise<UserStatus> {
  const data = await fetch("/api/user/status").then((res) => res.json());
  return {
    authConfigured: Boolean(data.authConfigured),
    databaseConfigured: Boolean(data.databaseConfigured),
    encryptionConfigured: Boolean(data.encryptionConfigured),
    persistentPlaidEnabled: Boolean(data.persistentPlaidEnabled),
    plaidStorageMode: data.plaidStorageMode ?? "none",
    signedIn: Boolean(data.signedIn),
    storageMode: data.storageMode ?? "localStorage",
    user: data.user ?? null,
  };
}

/** Loads the signed-in session once and shares it app-wide. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UserStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchStatus());
    } catch {
      setStatus(defaultStatus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session load
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      loading,
      accountBacked: status.signedIn && status.databaseConfigured,
      refresh,
    }),
    [status, loading, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
