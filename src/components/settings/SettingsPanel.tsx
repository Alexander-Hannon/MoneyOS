"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useMoneyData, type UserDataExport } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { ConsentRecord } from "@/types/user";
import type { ConnectedInstitutionDisplay } from "@/types/actions";
import { EnvironmentDiagnosticsPanel } from "@/components/settings/EnvironmentDiagnosticsPanel";
import { DuplicateRepairPanel } from "@/components/settings/DuplicateRepairPanel";
import { RefreshLiveBalancesButton } from "@/components/plaid/RefreshLiveBalancesButton";

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24 overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex justify-between gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={ok ? "text-success" : "text-warning"}>{ok ? "OK" : "Not set"}</dd>
    </div>
  );
}

function DisconnectDialog({
  institution,
  onClose,
}: {
  institution: ConnectedInstitutionDisplay | null;
  onClose: () => void;
}) {
  const fd = useFinancialData();
  const toast = useToast();
  const [deleteHistory, setDeleteHistory] = useState(false);
  if (!institution) return null;

  const disconnect = async () => {
    await fd.disconnectPlaid(institution.plaidItemId ?? undefined, { deleteHistory });
    toast(
      deleteHistory
        ? `${institution.institutionName} disconnected and its history deleted`
        : `${institution.institutionName} disconnected`,
    );
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Disconnect ${institution.institutionName}?`}
      description="MoneyOS stops syncing this bank. Nothing changes at your bank."
    >
      <div className="space-y-4 text-sm">
        <fieldset className="space-y-2">
          <legend className="sr-only">What happens to stored history</legend>
          <label className="flex items-start gap-2">
            <input type="radio" checked={!deleteHistory} onChange={() => setDeleteHistory(false)} className="mt-1" />
            <span>
              Keep its accounts and transactions
              <span className="block text-xs text-muted-foreground">History stays visible; no new data syncs.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" checked={deleteHistory} onChange={() => setDeleteHistory(true)} className="mt-1" />
            <span>
              Delete its accounts, transactions, and balance history
              <span className="block text-xs text-destructive">This can’t be undone.</span>
            </span>
          </label>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void disconnect()}
            disabled={fd.busy}
            className={deleteHistory ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {deleteHistory ? "Disconnect and delete" : "Disconnect"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function SettingsPanel() {
  const fd = useFinancialData();
  const money = useMoneyData();
  const toast = useToast();
  const { status } = useUserStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<UserDataExport | null>(null);
  const [consent, setConsent] = useState<ConsentRecord[]>([]);
  const [disconnecting, setDisconnecting] = useState<ConnectedInstitutionDisplay | null>(null);
  const account = money.dataMode === "account";

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    fetch("/api/user/consent")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.consentHistory)) setConsent(data.consentHistory);
      })
      .catch(() => {
        if (!cancelled) setConsent([]);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(money.exportData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneyos-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export downloaded");
  };

  const readImport = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as UserDataExport;
        if (parsed?.version !== 1 || !Array.isArray(parsed.bills)) throw new Error();
        setPendingImport(parsed);
      } catch {
        setImportError("That file isn’t a MoneyOS export.");
      }
    };
    reader.readAsText(file);
  };

  const latestConsent = consent[0];
  const institutions = fd.connectedInstitutions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account, bank connections, and data.</p>
      </div>

      <Section title="Account">
        {status.signedIn ? (
          <p className="text-sm">
            Signed in as <span className="font-medium">{status.user?.email ?? status.user?.displayName ?? "you"}</span>.
            Your data is saved to your account and syncs across devices.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">You’re viewing the demo. Sign in to use MoneyOS with your own data.</p>
            {status.authConfigured ? (
              <Link href="/sign-in" className="rounded-[var(--radius-sm)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                Sign in
              </Link>
            ) : null}
          </div>
        )}
      </Section>

      <Section
        id="live-bank-accounts"
        title="Bank connections"
        description="Read-only access through Plaid. MoneyOS can’t move money."
      >
        {fd.liveConnected ? <RefreshLiveBalancesButton variant="secondary" /> : null}
        {institutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {account ? "No banks connected yet. Use Connect bank at the top of the page." : "Sign in to connect a bank."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-[var(--radius-sm)] border border-border">
            {institutions.map((inst) => {
              const live = fd.liveInstitutions.some((l) => l.id === inst.id);
              return (
                <li key={inst.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {inst.institutionName}
                      <span className="ml-2 rounded-[3px] border border-border px-1.5 py-px text-[11px] font-normal text-muted-foreground">
                        {live ? "Personal Live" : "Plaid Sandbox"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inst.accountCount} {inst.accountCount === 1 ? "account" : "accounts"}, last synced{" "}
                      {inst.lastSyncAt ? new Date(inst.lastSyncAt).toLocaleString() : "never"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDisconnecting(inst)} disabled={fd.busy}>
                    <Unplug className="size-3.5" /> Disconnect
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Your data" description="Download everything you’ve entered, or bring in a previous export.">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={exportJson} disabled={!money.hydrated}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={!account}>
            <Upload className="size-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readImport(f);
              e.target.value = "";
            }}
          />
        </div>
        {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
        <p className="text-xs text-muted-foreground">
          Exports include bills, income, subscriptions, alerts, planned spending, and manual accounts. Bank transactions
          stay with your connected banks.
        </p>
      </Section>

      <Section title="Privacy and consent">
        {latestConsent ? (
          <p className="text-sm">
            You approved bank data access on {new Date(latestConsent.acceptedAt).toLocaleDateString()} (consent version{" "}
            {latestConsent.version}).
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No bank data consent recorded yet.</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-primary hover:underline">Privacy policy</Link>
          <Link href="/terms" className="text-primary hover:underline">Terms of use</Link>
        </div>
      </Section>

      <details className="group rounded-[var(--radius)] border border-border bg-card">
        <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium">Advanced diagnostics</summary>
        <div className="space-y-6 border-t border-border p-5">
          <dl className="grid gap-2 sm:grid-cols-2">
            <StatusRow label="Sign-in service" ok={status.authConfigured} />
            <StatusRow label="Database" ok={status.databaseConfigured} />
            <StatusRow label="Token encryption" ok={status.encryptionConfigured} />
            <StatusRow label="Saved bank connections" ok={status.persistentPlaidEnabled} />
          </dl>
          <EnvironmentDiagnosticsPanel />
          {fd.liveConnected ? <DuplicateRepairPanel /> : null}
        </div>
      </details>

      <DisconnectDialog institution={disconnecting} onClose={() => setDisconnecting(null)} />

      <Dialog
        open={pendingImport != null}
        onClose={() => setPendingImport(null)}
        title="Import this export?"
        description="Adds new records and updates ones with the same id. Nothing is deleted."
      >
        {pendingImport ? (
          <div className="space-y-4 text-sm">
            <p>
              {pendingImport.bills.length} bills, {pendingImport.income?.length ?? 0} income sources,{" "}
              {pendingImport.subscriptions?.length ?? 0} subscriptions, and{" "}
              {pendingImport.spendingLater?.length ?? 0} planned items from{" "}
              {new Date(pendingImport.exportedAt).toLocaleDateString()}.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingImport(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  money.importData(pendingImport);
                  setPendingImport(null);
                  toast("Import saved to your account");
                }}
              >
                Import
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
