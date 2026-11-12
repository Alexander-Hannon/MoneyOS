"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";

/*
 * One-time import for MoneyOS data saved only in this browser by older
 * versions (before accounts were required). Local data is kept until the
 * server confirms the import. Demo data is never offered for import.
 */

const LEGACY_KEYS = {
  bills: "moneyos:bills",
  income: "moneyos:income",
  subscriptions: "moneyos:subscriptions",
  alerts: "moneyos:alerts",
  spendingLater: "moneyos:spending-later",
  manualAccounts: "moneyos:manual-accounts",
  weeklyReviews: "moneyos:weekly-reviews",
} as const;
const LEGACY_MODE_KEY = "moneyos:app-mode";
const LEGACY_SYNCED_KEY = "moneyos:account-data-synced-at";
const LEGACY_CLEANUP_KEYS = [
  ...Object.values(LEGACY_KEYS),
  LEGACY_MODE_KEY,
  LEGACY_SYNCED_KEY,
  "moneyos:onboarding-completed",
  "moneyos:migration-completed",
  "moneyos:account-data-local-modified-at",
  "moneyos:account-sync-diagnostics",
  "moneyos:dismissed-recurring",
  "moneyos:dismissed-actions",
];

type LegacyBundle = Record<keyof typeof LEGACY_KEYS, unknown[]>;

function readArray(key: string): unknown[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLegacyBundle(): { bundle: LegacyBundle; total: number } | null {
  try {
    const mode = window.localStorage.getItem(LEGACY_MODE_KEY);
    // Demo data and devices that already synced with an account are skipped.
    if (mode === "demo" || mode === '"demo"') return null;
    if (window.localStorage.getItem(LEGACY_SYNCED_KEY)) return null;
  } catch {
    return null;
  }
  const bundle = Object.fromEntries(
    Object.entries(LEGACY_KEYS).map(([name, key]) => [name, readArray(key)]),
  ) as LegacyBundle;
  const total = Object.values(bundle).reduce((n, list) => n + list.length, 0);
  return total > 0 ? { bundle, total } : null;
}

function clearLegacy() {
  try {
    for (const key of LEGACY_CLEANUP_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Nothing else to do; the import already succeeded server-side.
  }
}

export function LegacyDataImport() {
  const money = useMoneyData();
  const toast = useToast();
  const [legacy] = useState(() => (typeof window === "undefined" ? null : readLegacyBundle()));
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (money.dataMode !== "account" || !legacy || hidden) return null;

  const importNow = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge_local",
          deviceFingerprint: "legacy-browser-import",
          data: { appMode: "local_user", ...legacy.bundle },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.message ?? "Import failed. Your browser copy is unchanged.");
      }
      clearLegacy();
      await money.reload();
      setHidden(true);
      toast("Imported data from this browser");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Your browser copy is unchanged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-info/30 bg-info/5 px-4 py-3 text-sm">
      <p className="min-w-0 flex-1">
        This browser has {legacy.total} MoneyOS {legacy.total === 1 ? "record" : "records"} saved
        before accounts. Import them into your account? Duplicates are skipped, and the browser copy
        is kept until the import succeeds.
        {error ? <span className="mt-1 block text-destructive">{error}</span> : null}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setHidden(true)} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" onClick={() => void importNow()} disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </Button>
      </div>
    </div>
  );
}
