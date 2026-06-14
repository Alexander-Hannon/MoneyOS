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
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatLastSync, plaidStatusLabel } from "@/lib/data-source";

type LinkTokenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_configured"; message: string }
  | { status: "ready"; token: string }
  | { status: "error"; message: string };

export function BankConnectionControl() {
  const fd = useFinancialData();
  const appMode = useAppMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [tokenState, setTokenState] = useState<LinkTokenState>({ status: "idle" });
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);

  const fetchLinkToken = useCallback(async () => {
    setTokenState({ status: "loading" });
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      if (data.configured === false) {
        setTokenState({ status: "not_configured", message: data.message });
      } else if (data.link_token) {
        setTokenState({ status: "ready", token: data.link_token });
      } else {
        setTokenState({
          status: "error",
          message: data.error ?? "Could not start the Plaid connection.",
        });
      }
    } catch {
      setTokenState({
        status: "error",
        message: "Could not reach the Plaid endpoint.",
      });
    }
  }, []);

  useEffect(() => {
    if (!fd.plaidConnected && fd.configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLinkToken();
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

  const token = tokenState.status === "ready" ? tokenState.token : null;
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      setConsentOpen(false);
      appMode.clearPendingPlaidConnect();
      void fd.handleLinkSuccess(publicToken);
    },
  });

  const startConnect = useCallback(() => {
    if (tokenState.status === "ready" && ready) {
      setConsentOpen(true);
    } else if (fd.configured) {
      fetchLinkToken().then(() => setConsentOpen(true));
    }
  }, [tokenState.status, ready, fd.configured, fetchLinkToken]);

  useEffect(() => {
    if (
      appMode.pendingPlaidConnect &&
      !fd.plaidConnected &&
      fd.configured &&
      tokenState.status === "ready" &&
      ready &&
      !pendingHandled.current
    ) {
      pendingHandled.current = true;
      setConsentOpen(true);
    }
  }, [
    appMode.pendingPlaidConnect,
    fd.plaidConnected,
    fd.configured,
    tokenState.status,
    ready,
  ]);

  const onConsentAccept = () => {
    appMode.recordPlaidConsent();
    setConsentOpen(false);
    open();
  };

  const badge = fd.dataSourceBadge;

  return (
    <>
      <PlaidConsentDialog
        open={consentOpen}
        onClose={() => {
          setConsentOpen(false);
          appMode.clearPendingPlaidConnect();
        }}
        onAccept={onConsentAccept}
        busy={fd.busy}
      />

      <div className="relative" ref={menuRef}>
        {fd.plaidConnected ? (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/15"
          >
            <Landmark className="size-3.5" />
            <span className="hidden sm:inline">
              {plaidStatusLabel(fd.plaidConnectionStatus)}
            </span>
            <span className="sm:hidden">Connected</span>
            <ChevronDown className="size-3.5 opacity-70" />
          </button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={
              !fd.configured ||
              tokenState.status === "loading" ||
              fd.busy ||
              (tokenState.status === "ready" && !ready)
            }
            onClick={startConnect}
            className="h-8 gap-1.5 text-xs"
          >
            <Lock className="size-3.5" />
            {fd.busy
              ? "Connecting…"
              : !fd.configured
                ? "Plaid unavailable"
                : "Connect bank"}
          </Button>
        )}

        {menuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-[var(--radius)] border border-border bg-card p-3 shadow-xl">
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-foreground">Bank connection</p>
                <p className="mt-0.5 text-muted-foreground">
                  {plaidStatusLabel(fd.plaidConnectionStatus)}
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

              <p className="text-muted-foreground">
                {fd.linkedAccounts.length} account
                {fd.linkedAccounts.length === 1 ? "" : "s"} · {badge}
              </p>

              <p className="rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-2 text-[11px] text-warning">
                Sandbox data — not live bank data
              </p>

              <div className="flex flex-col gap-1.5">
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
                  Sync transactions
                </button>
                <button
                  type="button"
                  disabled={fd.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Disconnect the Plaid sandbox session? Server-side access token will be removed.",
                      )
                    ) {
                      void fd.disconnectSandbox();
                      setMenuOpen(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-destructive/30 px-2.5 py-2 text-left font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Unplug className="size-3.5" />
                  Disconnect sandbox
                </button>
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
