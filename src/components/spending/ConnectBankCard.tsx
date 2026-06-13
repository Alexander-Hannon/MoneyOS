"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Landmark,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { usePlaid } from "@/components/spending/plaid-context";

type LinkTokenState =
  | { status: "loading" }
  | { status: "not_configured"; message: string }
  | { status: "ready"; token: string }
  | { status: "error"; message: string };

export function ConnectBankCard() {
  const plaid = usePlaid();
  const [tokenState, setTokenState] = useState<LinkTokenState>({
    status: "loading",
  });

  const fetchLinkToken = useCallback(async () => {
    setTokenState({ status: "loading" });
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
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
    // Only need a link token when not already connected.
    if (plaid.status !== "connected") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchLinkToken();
    }
  }, [fetchLinkToken, plaid.status]);

  const token = tokenState.status === "ready" ? tokenState.token : null;
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      void plaid.handleLinkSuccess(publicToken);
    },
  });

  // Connected success state.
  if (plaid.status === "connected") {
    return (
      <div className="rounded-[var(--radius)] border border-success/30 bg-success/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-success/15 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sandbox bank connected</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing Plaid sandbox accounts and transactions below. This is test
              data — not a live bank.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const notConfigured = tokenState.status === "not_configured";
  const errored = tokenState.status === "error" || plaid.status === "error";

  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/10 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
            errored ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"
          }`}
        >
          {errored ? (
            <TriangleAlert className="size-5" />
          ) : (
            <Landmark className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Connect a sandbox bank</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tokenState.status === "loading" && "Checking Plaid configuration…"}
            {notConfigured && tokenState.message}
            {tokenState.status === "error" && tokenState.message}
            {plaid.error && tokenState.status !== "error" && plaid.error}
            {tokenState.status === "ready" &&
              !plaid.error &&
              "Plaid sandbox is configured. Connect a test institution (use Plaid's sandbox credentials) to sync transactions."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant={tokenState.status === "ready" ? "default" : "secondary"}
              disabled={tokenState.status !== "ready" || !ready || plaid.busy}
              onClick={() => open()}
            >
              <Lock className="size-3.5" />
              {plaid.busy
                ? "Connecting…"
                : tokenState.status === "ready"
                  ? "Connect sandbox bank"
                  : "Plaid not configured"}
            </Button>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" />
              Tokens stay server-side — never stored in your browser.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
