"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaidLinkExitAlert } from "@/components/plaid/PlaidLinkExitAlert";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import {
  shouldShowLiveConnectPrimary,
  usePlaidConnection,
} from "@/hooks/usePlaidConnection";
import { formatLastSync, plaidStatusLabel } from "@/lib/data-source";
import { RefreshLiveBalancesButton } from "@/components/plaid/RefreshLiveBalancesButton";
import type { ConnectedInstitutionDisplay } from "@/types/actions";

function InstitutionList({
  title,
  institutions,
  tone,
  fd,
  onAction,
}: {
  title: string;
  institutions: ConnectedInstitutionDisplay[];
  tone: "sandbox" | "live";
  fd: ReturnType<typeof useFinancialData>;
  onAction: () => void;
}) {
  if (institutions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1.5 rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
        {institutions.map((inst) => (
          <li
            key={inst.id}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{inst.institutionName}</p>
              <p className="text-[10px] text-muted-foreground">
                {inst.accountCount} acct · {formatLastSync(inst.lastSyncAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={fd.busy}
                onClick={() => {
                  void fd.syncTransactions(inst.plaidItemId ?? undefined);
                }}
                className="rounded px-1.5 py-1 hover:bg-accent"
                aria-label={`Sync ${inst.institutionName}`}
              >
                <RefreshCw className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={fd.busy}
                onClick={() => {
                  const keepHistory = window.confirm(
                    `Disconnect ${inst.institutionName}?\n\nOK = keep historical transactions\nCancel = abort`,
                  );
                  if (!keepHistory) return;

                  const deleteHistory =
                    tone === "live" &&
                    window.confirm(
                      "Also delete all stored transactions and accounts for this institution? This cannot be undone.",
                    );

                  void fd.disconnectPlaid(inst.plaidItemId ?? undefined, {
                    deleteHistory,
                  });
                  onAction();
                }}
                className="rounded px-1.5 py-1 text-destructive hover:bg-destructive/10"
                aria-label={`Disconnect ${inst.institutionName}`}
              >
                <Unplug className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BankConnectionControl() {
  const fd = useFinancialData();
  const appMode = useAppMode();
  const {
    startPlaidConnection,
    retryPlaidConnection,
    tryAnotherInstitution,
    dismissLinkExit,
    linkBusy,
    linkError,
    linkExitDiagnostics,
  } = usePlaidConnection();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const badge = fd.dataSourceBadge;
  const showLiveConnect = shouldShowLiveConnectPrimary({
    livePlaidEnabled: fd.livePlaidEnabled,
    liveUserAllowed: fd.liveUserAllowed,
    storedMode: appMode.storedMode,
  });
  const isLiveActive = fd.activePlaidEnvironment === "production";
  const connectBusy = fd.busy || linkBusy;

  return (
    <div className="relative flex flex-col items-end gap-2">
      <div className="relative" ref={menuRef}>
      {fd.plaidConnected ? (
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-90 ${
            isLiveActive
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          <Landmark className="size-3.5" />
          <span className="hidden sm:inline">
            {plaidStatusLabel(fd.plaidConnectionStatus, fd.activePlaidEnvironment)}
          </span>
          <span className="sm:hidden">
            {isLiveActive ? "Personal Live" : "Connected"}
          </span>
          <ChevronDown className="size-3.5 opacity-70" />
        </button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={(!fd.configured && !showLiveConnect) || connectBusy}
          onClick={() => setMenuOpen((v) => !v)}
          className="h-8 gap-1.5 text-xs"
        >
          <Lock className="size-3.5" />
          Connect bank
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      )}

      {menuOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-[var(--radius)] border border-border bg-card p-3 shadow-xl">
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-medium text-foreground">Bank connection</p>
              <p className="mt-0.5 text-muted-foreground">
                {plaidStatusLabel(
                  fd.plaidConnectionStatus,
                  fd.activePlaidEnvironment,
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Mode
                </p>
                <p className="mt-0.5 font-medium">{fd.modeLabel}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-muted/20 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Last sync
                </p>
                <p className="mt-0.5 font-medium">
                  {formatLastSync(fd.lastSyncAt)}
                </p>
              </div>
            </div>

            {isLiveActive && (
              <div className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2">
                <RefreshLiveBalancesButton
                  variant="ghost"
                  showQuota
                  className="w-full"
                />
              </div>
            )}

            <p className="text-muted-foreground">{badge}</p>

            {fd.plaidStorageMode === "database" && (
              <p className="rounded-[var(--radius-md)] border border-success/20 bg-success/5 p-2 text-[11px] text-success">
                Encrypted tokens persisted to database
              </p>
            )}

            {isLiveActive ? (
              <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                Personal live data — real bank data · private owner mode
              </p>
            ) : (
              fd.plaidConnected && (
                <p className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2 text-[11px] text-warning">
                  Sandbox data — not live bank data
                </p>
              )
            )}

            {fd.devOnlyPlaidWarning && (
              <p className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2 text-[11px] text-warning">
                {fd.devOnlyPlaidWarning}
              </p>
            )}

            <InstitutionList
              title="Sandbox"
              institutions={fd.sandboxInstitutions}
              tone="sandbox"
              fd={fd}
              onAction={() => setMenuOpen(false)}
            />
            <InstitutionList
              title="Personal Live"
              institutions={fd.liveInstitutions}
              tone="live"
              fd={fd}
              onAction={() => setMenuOpen(false)}
            />

            {linkError && (
              <p className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                {linkError}
              </p>
            )}

            {linkExitDiagnostics && (
              <PlaidLinkExitAlert
                diagnostics={linkExitDiagnostics}
                busy={connectBusy}
                onRetry={() => {
                  retryPlaidConnection();
                }}
                onTryAnother={() => {
                  tryAnotherInstitution();
                }}
                onDismiss={dismissLinkExit}
              />
            )}

            <div className="flex flex-col gap-1.5">
              {showLiveConnect && (
                <button
                  type="button"
                  disabled={connectBusy}
                  onClick={() => {
                    setMenuOpen(false);
                    startPlaidConnection({ environment: "production" });
                  }}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-warning/40 px-2.5 py-2 text-left font-medium text-warning transition-colors hover:bg-warning/10"
                >
                  <Lock className="size-3.5" />
                  Connect real bank
                </button>
              )}
              {fd.sandboxConnectAvailable && (
                <button
                  type="button"
                  disabled={connectBusy || !fd.configured}
                  onClick={() => {
                    setMenuOpen(false);
                    startPlaidConnection({ environment: "sandbox" });
                  }}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-2.5 py-2 text-left font-medium transition-colors hover:bg-accent"
                >
                  <Lock className="size-3.5" />
                  Connect sandbox bank
                </button>
              )}
              {fd.plaidConnected && (
                <button
                  type="button"
                  disabled={fd.busy}
                  onClick={() => {
                    void fd.syncTransactions();
                    setMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-2.5 py-2 text-left font-medium transition-colors hover:bg-accent"
                >
                  <RefreshCw className="size-3.5" />
                  Sync all
                </button>
              )}
            </div>

            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3 text-success" />
              Tokens stay server-side only
            </p>
          </div>
        </div>
        )}
      </div>

      {linkExitDiagnostics && !menuOpen && (
        <div className="w-80 max-w-[calc(100vw-2rem)]">
          <PlaidLinkExitAlert
            diagnostics={linkExitDiagnostics}
            busy={connectBusy}
            onRetry={retryPlaidConnection}
            onTryAnother={tryAnotherInstitution}
            onDismiss={dismissLinkExit}
          />
        </div>
      )}
    </div>
  );
}
