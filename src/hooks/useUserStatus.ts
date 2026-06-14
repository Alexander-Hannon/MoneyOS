"use client";

import { useEffect, useState } from "react";

export type UserStatus = {
  authConfigured: boolean;
  databaseConfigured: boolean;
  signedIn: boolean;
  storageMode: "localStorage" | "database" | "mixed";
  user: { email: string | null; displayName: string | null } | null;
};

const defaultStatus: UserStatus = {
  authConfigured: false,
  databaseConfigured: false,
  signedIn: false,
  storageMode: "localStorage",
  user: null,
};

export function useUserStatus() {
  const [status, setStatus] = useState<UserStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/status")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setStatus({
          authConfigured: Boolean(data.authConfigured),
          databaseConfigured: Boolean(data.databaseConfigured),
          signedIn: Boolean(data.signedIn),
          storageMode: data.storageMode ?? "localStorage",
          user: data.user ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setStatus(defaultStatus);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading, refresh: () => setLoading(true) };
}
