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
import { PlaidConsentDialog } from "@/components/plaid/PlaidConsentDialog";
import { useFinancialData } from "@/hooks/useFinancialData";

function formatLinkTokenError(data: Record<string, unknown>): string {
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.plaidErrorMessage === "string" && data.plaidErrorMessage) {
    const code =
      typeof data.plaidErrorCode === "string" ? ` (${data.plaidErrorCode})` : "";
    return `${data.plaidErrorMessage}${code}`;
  }
  if (typeof data.error === "string" && data.error) return data.error;
  if (data.errorCode === "plaid_config_missing") {
    return "Plaid sandbox is not configured on the server.";
  }
  if (data.errorCode === "plaid_config_invalid") {
    return "Plaid env vars are present but invalid — check Settings → Environment diagnostics.";
  }
  return "Could not start the Plaid connection.";
}

type LinkTokenState =
  | { status: "loading" }
  | { status: "not_configured"; message: string }
  | { status: "ready"; token: string }
  | { status: "error"; message: string };

export function ConnectBankCard() {
  const fd = useFinancialData();
  const [consentOpen, setConsentOpen] = useState(false);
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
        setTokenState({
          status: "not_configured",
          message: formatLinkTokenError(data),
        });
      } else if (data.link_token) {
        setTokenState({ status: "ready", token: data.link_token });
      } else {
        setTokenState({
          status: "error",
          message: formatLinkTokenError(data),
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

  const token = tokenState.status === "ready" ? tokenState.token : null;
  const { open, ready } = usePlaidLink({
    token,
    onSuccess: (publicToken) => {
      setConsentOpen(false);
      void fd.handleLinkSuccess(publicToken);
    },
  });

  if (fd.plaidConnected) {
    return (
      <div className="rounded-[var(--radius)] border border-success/30 bg-success/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-success/15 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Sandbox bank connected</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dashboard and spending use Plaid sandbox data. Manage connection in
              the header (top-right).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const notConfigured = tokenState.status === "not_configured";
  const errored =
    tokenState.status === "error" || fd.plaidConnectionStatus === "error";

  return (
    <>
      <PlaidConsentDialog
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={() => {
          setConsentOpen(false);
          open();
        }}
        busy={fd.busy}
      />

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
              {fd.error && tokenState.status !== "error" && fd.error}
              {tokenState.status === "ready" &&
                !fd.error &&
                "Use the header “Connect bank” or connect here. Consent is required before Plaid Link opens."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant={tokenState.status === "ready" ? "default" : "secondary"}
                disabled={
                  tokenState.status !== "ready" || !ready || fd.busy
                }
                onClick={() => setConsentOpen(true)}
              >
                <Lock className="size-3.5" />
                {fd.busy
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
    </>
  );
}
