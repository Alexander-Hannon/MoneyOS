"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  Trash2,
  Sparkles,
  Rocket,
  Unplug,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMoneyData, type UserDataExport } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import { clearAllMoneyOSData } from "@/lib/storage/local-storage";

export function SettingsPanel() {
  const appMode = useAppMode();
  const fd = useFinancialData();
  const money = useMoneyData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Data source, privacy controls, and local data management.
        </p>
      </div>

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
            Local development consent record only. Production consent must be
            stored server-side in an encrypted database.
          </p>
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
                <dd className="mt-0.5">{latestConsent.dataScopes.join(", ")}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">No consent recorded yet.</p>
          )}
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
