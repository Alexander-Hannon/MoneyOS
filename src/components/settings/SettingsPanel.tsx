"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  Trash2,
  Sparkles,
  Rocket,
  Unplug,
  AlertTriangle,
  CloudUpload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useMoneyData, type UserDataExport } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import { clearAllMoneyOSData, loadCollection, STORAGE_KEYS } from "@/lib/storage/local-storage";
import { localDataFingerprint } from "@/lib/sync/account-data-utils";
import type { ConsentRecord } from "@/types/user";
import { isClerkPublishableConfigured } from "@/lib/auth/config-client";
import { EnvironmentDiagnosticsPanel } from "@/components/settings/EnvironmentDiagnosticsPanel";
import { SyncDiagnosticsPanel } from "@/components/settings/SyncDiagnosticsPanel";
import { DuplicateRepairPanel } from "@/components/settings/DuplicateRepairPanel";
import { RefreshMoneyOSDataButton } from "@/components/sync/RefreshMoneyOSDataButton";
import { RefreshLiveBalancesButton } from "@/components/plaid/RefreshLiveBalancesButton";
import { useAccountDataSync } from "@/context/AccountDataSyncProvider";

export function SettingsPanel() {
  const appMode = useAppMode();
  const fd = useFinancialData();
  const accountSync = useAccountDataSync();
  const money = useMoneyData();
  const toast = useToast();
  const { status } = useUserStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [accountConsent, setAccountConsent] = useState<ConsentRecord[]>([]);
  const [syncBusy, setSyncBusy] = useState(false);
  const [encryptionMismatch, setEncryptionMismatch] = useState(false);

  useEffect(() => {
    if (!status.signedIn || !status.databaseConfigured) return;

    let cancelled = false;
    fetch("/api/plaid/status")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const health = data.diagnostics?.storedEncryptionHealth;
        setEncryptionMismatch(
          Boolean(health?.hasStoredTokens && health?.decryptOk === false),
        );
      })
      .catch(() => {
        if (!cancelled) setEncryptionMismatch(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status.signedIn, status.databaseConfigured]);

  const showEncryptionMismatch =
    status.signedIn && status.databaseConfigured && encryptionMismatch;

  useEffect(() => {
    if (!status.signedIn) return;
    let cancelled = false;
    fetch("/api/user/consent")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.consentHistory)) {
          setAccountConsent(data.consentHistory);
        }
      })
      .catch(() => {
        if (!cancelled) setAccountConsent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status.signedIn]);

  const exportJson = () => {
    const data = money.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneyos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Local data exported");
  };

  const handleImport = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as UserDataExport;
        if (!window.confirm("Import will overwrite your current local data. Continue?")) {
          return;
        }
        money.importData(parsed);
        toast("Local data imported");
      } catch {
        setImportError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const latestConsent = appMode.consentHistory[0];
  const latestAccountConsent = status.signedIn ? accountConsent[0] : undefined;
  const storageModeLabel =
    status.signedIn && status.databaseConfigured
      ? status.storageMode === "database"
        ? "database"
        : "mixed"
      : "localStorage";

  const mergeToAccount = async () => {
    if (
      !window.confirm(
        "Merge this device's local MoneyOS data into your signed-in account? Existing account records are kept when duplicates are detected.",
      )
    ) {
      return;
    }
    setSyncBusy(true);
    try {
      const payload = money.exportData();
      const weeklyReviews = loadCollection(STORAGE_KEYS.weeklyReviews, []);
      const res = await fetch("/api/user/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge_local",
          deviceFingerprint: localDataFingerprint(payload),
          data: {
            ...payload,
            weeklyReviews,
            consentHistory: appMode.consentHistory,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message ?? "Merge failed");
      }
      if (data.warning) {
        toast(data.warning);
      } else {
        const counts = data.counts;
        const parts = [
          counts?.bills ? `${counts.bills} bills` : null,
          counts?.subscriptions ? `${counts.subscriptions} subscriptions` : null,
          counts?.incomeSources ? `${counts.incomeSources} income sources` : null,
        ].filter(Boolean);
        toast(
          parts.length > 0
            ? `Merged ${parts.join(", ")} into your account`
            : (data.message ?? "Local data merged into your account"),
        );
      }
      if (!data.warning) {
        await accountSync.refreshAccountData();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not merge to account");
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data source, account, privacy controls, and local data management.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <User className="size-4" /> Account
          </h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={status.signedIn ? "Signed in" : "Local mode"}
              tone={status.signedIn ? "success" : "neutral"}
            />
            {status.user?.email && (
              <StatusBadge label={status.user.email} tone="info" />
            )}
          </div>
          {status.signedIn ? (
            <p className="text-xs text-muted-foreground">
              Signed in as {status.user?.displayName ?? status.user?.email ?? "user"}.
            </p>
          ) : isClerkPublishableConfigured() ? (
            <p className="text-xs text-muted-foreground">
              Sign in to save your MoneyOS data securely across devices.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Authentication is not configured — running in local development mode.
            </p>
          )}
          {status.signedIn && status.databaseConfigured && (
            <div className="space-y-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={syncBusy || accountSync.busy}
                onClick={() => void mergeToAccount()}
              >
                <CloudUpload className="size-3.5" /> Merge local data into my MoneyOS account
              </Button>
              <RefreshMoneyOSDataButton />
              <SyncDiagnosticsPanel />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Future: request account deletion workflow (not implemented in Phase 9).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-sm font-medium">Database & auth</h2>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Auth configured</dt>
              <dd className="font-medium">
                {status.authConfigured ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Database configured</dt>
              <dd className="font-medium">
                {status.databaseConfigured ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2 sm:col-span-2">
              <dt className="text-muted-foreground">Storage mode</dt>
              <dd className="font-medium">{storageModeLabel}</dd>
            </div>
          </dl>
          {showEncryptionMismatch && (
            <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
              Plaid encryption key mismatch: this device cannot decrypt stored
              Plaid tokens. Use the same PLAID_TOKEN_ENCRYPTION_KEY on every
              device connected to this database, or reconnect sandbox
              institutions from this device.
            </p>
          )}
          <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            {status.persistentPlaidEnabled
              ? "Plaid tokens are encrypted at rest in Postgres for signed-in users. Personal live mode requires additional env flags and owner email allowlist."
              : "Plaid persistence requires sign-in, DATABASE_URL, and PLAID_TOKEN_ENCRYPTION_KEY. Without all three, tokens stay in dev-only server memory."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-sm font-medium">Plaid persistence</h2>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Encryption configured</dt>
              <dd className="font-medium">
                {status.encryptionConfigured ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Plaid storage mode</dt>
              <dd className="font-medium">{fd.plaidStorageMode}</dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2 sm:col-span-2">
              <dt className="text-muted-foreground">Persistent sandbox enabled</dt>
              <dd className="font-medium">
                {status.persistentPlaidEnabled ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
          {fd.connectedInstitutions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Institution</th>
                    <th className="py-2 pr-3">Accounts</th>
                    <th className="py-2 pr-3">Last sync</th>
                    <th className="py-2">Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {fd.connectedInstitutions.map((inst) => (
                    <tr key={inst.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">
                        {inst.institutionName}
                      </td>
                      <td className="py-2 pr-3 num">
                        {inst.accountCount}
                      </td>
                      <td className="py-2 pr-3">
                        {inst.lastSyncAt
                          ? new Date(inst.lastSyncAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="py-2">
                        {fd.plaidStorageMode === "database"
                          ? "database"
                          : "memory"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No connected sandbox institutions yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-warning/30" id="live-bank-accounts">
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-sm font-medium">Personal live Plaid (Phase 12)</h2>
          <p className="text-xs text-muted-foreground">
            Private owner mode — not public SaaS launch. Real bank data through
            Plaid Production when all safety checks pass.
          </p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Live Plaid enabled</dt>
              <dd className="font-medium">{fd.livePlaidEnabled ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Current Plaid env</dt>
              <dd className="font-medium">{fd.plaidEnv ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Allowed live user configured</dt>
              <dd className="font-medium">
                {fd.livePlaidEnabled ? (fd.liveUserAllowed ? "Yes (you)" : "Yes (other email)") : "No"}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
              <dt className="text-muted-foreground">Encryption configured</dt>
              <dd className="font-medium">
                {fd.encryptionConfigured ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
          <div className="space-y-1 text-xs">
            <p className="font-medium">Production safety checklist</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>MONEYOS_ENABLE_LIVE_PLAID=true</li>
              <li>MONEYOS_ALLOWED_LIVE_USER_EMAIL matches signed-in Clerk email</li>
              <li>PLAID_ENV=production with production secret (never commit)</li>
              <li>Clerk + DATABASE_URL + PLAID_TOKEN_ENCRYPTION_KEY configured</li>
              <li>Same encryption key across devices sharing the database</li>
            </ul>
          </div>
          {fd.liveConnected && (
            <div className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-3">
              <RefreshLiveBalancesButton variant="secondary" />
            </div>
          )}
          {fd.liveInstitutions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium">Connected live institutions</p>
              <ul className="space-y-2">
                {fd.liveInstitutions.map((inst) => (
                  <li
                    key={inst.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2 text-xs"
                  >
                    <div>
                      <p className="font-medium">{inst.institutionName}</p>
                      <p className="text-muted-foreground">
                        {inst.accountCount} accounts ·{" "}
                        {inst.lastSyncAt
                          ? new Date(inst.lastSyncAt).toLocaleString()
                          : "Never synced"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={fd.busy}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Disconnect live institution ${inst.institutionName}?`,
                          )
                        ) {
                          return;
                        }
                        const deleteHistory = window.confirm(
                          "Also delete all stored transactions and accounts for this institution?",
                        );
                        void fd.disconnectPlaid(inst.plaidItemId ?? undefined, {
                          deleteHistory,
                        });
                        toast(
                          deleteHistory
                            ? "Live institution disconnected; history deleted"
                            : "Live institution disconnected",
                        );
                      }}
                    >
                      <Unplug className="size-3.5" /> Disconnect live
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No personal live institutions connected.
            </p>
          )}
          <DuplicateRepairPanel />
        </CardContent>
      </Card>

      <EnvironmentDiagnosticsPanel />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <h2 className="text-sm font-medium">Current mode</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={fd.modeLabel} tone="info" />
            <StatusBadge label={fd.dataSourceBadge} tone="neutral" />
          </div>
          <p className="text-xs text-muted-foreground">
            Stored mode: {fd.storedMode} · Effective: {fd.effectiveMode}
          </p>
          <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            Development / Sandbox mode — not production. Live bank connections
            and production security are not enabled.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="text-sm font-medium">Data management</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportJson}>
              <Download className="size-3.5" /> Export JSON
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" /> Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {importError && (
            <p className="text-xs text-destructive">{importError}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm("Start fresh with empty local data?")) {
                  money.startFresh();
                  toast("Started fresh — empty local data");
                }
              }}
            >
              <Rocket className="size-3.5" /> Start fresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm("Load generic demo data?")) {
                  money.loadDemoData();
                  toast("Demo data loaded");
                }
              }}
            >
              <Sparkles className="size-3.5" /> Load demo data
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset manual data to defaults for the current mode?",
                  )
                ) {
                  money.resetToModeDefaults();
                  toast("Reset to mode defaults");
                }
              }}
            >
              Reset local data
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (
                  window.confirm(
                    "Clear ALL local MoneyOS data including mode and onboarding? This cannot be undone.",
                  )
                ) {
                  clearAllMoneyOSData();
                  window.location.reload();
                }
              }}
            >
              <Trash2 className="size-3.5" /> Clear all data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="text-sm font-medium">Plaid sandbox</h2>
          <p className="text-xs text-muted-foreground">
            Status: {fd.plaidConnectionStatus} ·{" "}
            {fd.plaidConnected ? "Connected" : "Not connected"}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={!fd.plaidConnected || fd.busy}
            onClick={() => {
              if (
                window.confirm(
                  "Disconnect Plaid sandbox session? Server-side token will be removed.",
                )
              ) {
                void fd.disconnectSandbox();
                toast("Sandbox disconnected");
              }
            }}
          >
            <Unplug className="size-3.5" /> Disconnect sandbox bank
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h2 className="text-sm font-medium">Consent history</h2>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            Local development consent records are stored in this browser.
            Signed-in account consent is stored in the database when configured.
          </p>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium">Local consent</p>
              {latestConsent ? (
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Latest consent</dt>
                    <dd>{new Date(latestConsent.acceptedAt).toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Version</dt>
                    <dd>{latestConsent.version}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Scopes</dt>
                    <dd className="mt-0.5">
                      {latestConsent.dataScopes.join(", ")}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No local consent recorded yet.
                </p>
              )}
            </div>
            {status.signedIn && (
              <div>
                <p className="mb-1 text-xs font-medium">Account consent</p>
                {latestAccountConsent ? (
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Latest consent</dt>
                      <dd>
                        {new Date(latestAccountConsent.acceptedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Version</dt>
                      <dd>{latestAccountConsent.version}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No account consent recorded yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <h2 className="text-sm font-medium">Privacy & legal</h2>
          <p className="text-xs text-muted-foreground">
            Draft policies — not legal advice.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Use
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
