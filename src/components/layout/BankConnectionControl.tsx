"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { PlaidConsentDialog } from "@/components/plaid/PlaidConsentDialog";
import { LivePlaidConsentDialog } from "@/components/plaid/LivePlaidConsentDialog";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatLastSync, plaidStatusLabel } from "@/lib/data-source";
import type { PlaidLinkTarget } from "@/lib/plaid/plaid-env";
import type { ConnectedInstitutionDisplay } from "@/types/actions";

function formatLinkTokenError(data: Record<string, unknown>): string {
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.plaidErrorMessage === "string" && data.plaidErrorMessage) {
    const code =
      typeof data.plaidErrorCode === "string" ? ` (${data.plaidErrorCode})` : "";
    return `${data.plaidErrorMessage}${code}`;
  }
  if (typeof data.error === "string" && data.error) return data.error;
  if (data.errorCode === "plaid_config_missing") {
    return "Plaid is not configured on the server.";
  }
  if (data.errorCode === "live_plaid_disabled") {
    return "Personal live Plaid is disabled on this server.";
  }
  if (data.errorCode === "live_user_not_allowed") {
    return "Your account is not authorized for personal live Plaid.";
  }
  if (data.errorCode === "plaid_config_invalid") {
    return "Plaid env vars are present but invalid — check Settings → Environment diagnostics.";
  }
  return "Could not start the Plaid connection.";
}

type LinkTokenState =
  | { status: "idle"; target: PlaidLinkTarget | null }
  | { status: "loading"; target: PlaidLinkTarget }
  | { status: "not_configured"; target: PlaidLinkTarget; message: string }
  | { status: "ready"; target: PlaidLinkTarget; token: string }
  | { status: "error"; target: PlaidLinkTarget; message: string };

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [sandboxConsentOpen, setSandboxConsentOpen] = useState(false);
  const [liveConsentOpen, setLiveConsentOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PlaidLinkTarget>("sandbox");
  const [tokenState, setTokenState] = useState<LinkTokenState>({
    status: "idle",
    target: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);

  const fetchLinkToken = useCallback(async (target: PlaidLinkTarget) => {
    setTokenState({ status: "loading", target });
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEnvironment: target }),
      });
      const data = await res.json();
      if (data.configured === false || data.ok === false) {
        setTokenState({
          status: "not_configured",
          target,
          message: formatLinkTokenError(data),
        });
      } else if (data.link_token) {
        setTokenState({ status: "ready", target, token: data.link_token });
      } else {
        setTokenState({
          status: "error",
          target,
          message: formatLinkTokenError(data),
        });
      }
    } catch {
      setTokenState({
        status: "error",
        target,
        message: "Could not reach the Plaid endpoint.",
      });
    }
  }, []);

  useEffect(() => {
    if (!fd.plaidConnected && fd.configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchLinkToken("sandbox");
    }
  }, [fetchLinkToken, fd.plaidConnected, fd.configured]);

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

  const token =
    tokenState.status === "ready" && tokenState.target === linkTarget
      ? tokenState.token
      : null;

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      setSandboxConsentOpen(false);
      setLiveConsentOpen(false);
      appMode.clearPendingPlaidConnect();
      void fd.handleLinkSuccess(publicToken, linkTarget);
    },
  });

  const startConnect = useCallback(
    (target: PlaidLinkTarget) => {
      setLinkTarget(target);
      if (
        tokenState.status === "ready" &&
        tokenState.target === target &&
        ready
      ) {
        if (target === "production") setLiveConsentOpen(true);
        else setSandboxConsentOpen(true);
      } else if (fd.configured || target === "production") {
        void fetchLinkToken(target).then(() => {
          if (target === "production") setLiveConsentOpen(true);
          else setSandboxConsentOpen(true);
        });
      }
    },
    [tokenState.status, tokenState.target, ready, fd.configured, fetchLinkToken],
  );

  useEffect(() => {
    if (
      appMode.pendingPlaidConnect &&
      !fd.plaidConnected &&
      fd.configured &&
      tokenState.status === "ready" &&
      tokenState.target === "sandbox" &&
      ready &&
      !pendingHandled.current
    ) {
      pendingHandled.current = true;
      setLinkTarget("sandbox");
      setSandboxConsentOpen(true);
    }
  }, [
    appMode.pendingPlaidConnect,
    fd.plaidConnected,
    fd.configured,
    tokenState.status,
    tokenState.target,
    ready,
  ]);

  const onSandboxConsentAccept = () => {
    appMode.recordPlaidConsent();
    setSandboxConsentOpen(false);
    open();
  };

  const onLiveConsentAccept = () => {
    appMode.recordPlaidConsent();
    setLiveConsentOpen(false);
    open();
  };

  const badge = fd.dataSourceBadge;
  const showLiveConnect = fd.livePlaidEnabled && fd.liveUserAllowed;
  const isLiveActive = fd.activePlaidEnvironment === "production";

  return (
    <>
      <PlaidConsentDialog
        open={sandboxConsentOpen}
        onClose={() => {
          setSandboxConsentOpen(false);
          appMode.clearPendingPlaidConnect();
        }}
        onAccept={onSandboxConsentAccept}
        busy={fd.busy}
      />
      <LivePlaidConsentDialog
        open={liveConsentOpen}
        onClose={() => setLiveConsentOpen(false)}
        onAccept={onLiveConsentAccept}
        busy={fd.busy}
      />

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
            disabled={!fd.configured || fd.busy}
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
                  <p className="text-[10px] uppercase tracking-wide text-warning">
                    Balance refresh
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {fd.lastBalanceRefreshAt
                      ? `Last refreshed ${formatLastSync(fd.lastBalanceRefreshAt)}`
                      : "Not refreshed yet"}
                  </p>
                  <button
                    type="button"
                    disabled={fd.busy}
                    onClick={() => void fd.refreshBalances()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent"
                  >
                    <RefreshCw className="size-3" />
                    Refresh balances
                  </button>
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

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={fd.busy || !fd.configured}
                  onClick={() => {
                    setMenuOpen(false);
                    startConnect("sandbox");
                  }}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-2.5 py-2 text-left font-medium transition-colors hover:bg-accent"
                >
                  <Lock className="size-3.5" />
                  Connect sandbox bank
                </button>
                {showLiveConnect && (
                  <button
                    type="button"
                    disabled={fd.busy}
                    onClick={() => {
                      setMenuOpen(false);
                      startConnect("production");
                    }}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-warning/40 px-2.5 py-2 text-left font-medium text-warning transition-colors hover:bg-warning/10"
                  >
                    <Lock className="size-3.5" />
                    Connect real bank
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
    </>
  );
}
