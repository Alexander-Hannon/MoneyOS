"use client";

import { useCallback, useEffect, useState } from "react";
import { Landmark, Lock, ShieldCheck } from "lucide-react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type LinkTokenState =
  | { status: "loading" }
  | { status: "not_configured"; message: string }
  | { status: "ready"; token: string }
  | { status: "error"; message: string };

export function ConnectBankCard() {
  const toast = useToast();
  const [state, setState] = useState<LinkTokenState>({ status: "loading" });

  const fetchLinkToken = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await res.json();
      if (data.configured === false) {
        setState({ status: "not_configured", message: data.message });
      } else if (data.link_token) {
        setState({ status: "ready", token: data.link_token });
      } else {
        setState({
          status: "error",
          message: data.error ?? "Could not start the Plaid connection.",
        });
      }
    } catch {
      setState({
        status: "error",
        message: "Could not reach the Plaid endpoint.",
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLinkToken();
  }, [fetchLinkToken]);

  // usePlaidLink must be called unconditionally; token may be null until ready.
  const token = state.status === "ready" ? state.token : null;
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken) => {
      // Exchange happens entirely server-side; we never store the access token.
      await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken }),
      });
      toast("Sandbox bank connected");
    },
  });

  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/10 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-info/10 text-info">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Connect a sandbox bank</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {state.status === "loading" && "Checking Plaid configuration…"}
            {state.status === "not_configured" && state.message}
            {state.status === "error" && state.message}
            {state.status === "ready" &&
              "Plaid sandbox is configured. Connect a test institution to sync transactions."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant={state.status === "ready" ? "default" : "secondary"}
              disabled={state.status !== "ready" || !ready}
              onClick={() => open()}
            >
              <Lock className="size-3.5" />
              {state.status === "ready"
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
