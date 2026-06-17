"use client";

import {
  CheckCircle2,
  Landmark,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppMode } from "@/context/AppModeProvider";
import { useFinancialData } from "@/hooks/useFinancialData";
import {
  shouldShowLiveConnectPrimary,
  usePlaidConnection,
} from "@/hooks/usePlaidConnection";

export function ConnectBankCard() {
  const fd = useFinancialData();
  const appMode = useAppMode();
  const { startPlaidConnection, linkBusy, linkError } = usePlaidConnection();

  const showLivePrimary = shouldShowLiveConnectPrimary({
    livePlaidEnabled: fd.livePlaidEnabled,
    liveUserAllowed: fd.liveUserAllowed,
    storedMode: appMode.storedMode,
  });
  const showSandboxPrimary =
    !showLivePrimary &&
    fd.sandboxConnectAvailable &&
    appMode.storedMode === "plaid_sandbox";
  const connectBusy = fd.busy || linkBusy;
  const isLiveConnected = fd.activePlaidEnvironment === "production";

  if (fd.plaidConnected) {
    return (
      <div
        className={`rounded-[var(--radius)] border p-5 ${
          isLiveConnected
            ? "border-warning/30 bg-warning/5"
            : "border-success/30 bg-success/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
              isLiveConnected
                ? "bg-warning/15 text-warning"
                : "bg-success/15 text-success"
            }`}
          >
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {isLiveConnected ? "Real bank connected" : "Sandbox bank connected"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isLiveConnected
                ? "Dashboard and spending use personal live Plaid data. Manage connection in the header (top-right)."
                : "Dashboard and spending use Plaid sandbox data. Manage connection in the header (top-right)."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showLivePrimary) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-warning/40 bg-warning/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-warning/10 text-warning">
            <Landmark className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Connect real bank</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect real financial data through Plaid. Tokens stay encrypted
              server-side.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={connectBusy}
                onClick={() =>
                  startPlaidConnection({ environment: "production" })
                }
                className="border-warning/40 text-warning hover:bg-warning/10"
              >
                <Lock className="size-3.5" />
                Connect real bank
              </Button>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" />
                Typed confirmation required before Link opens
              </span>
            </div>
            {linkError && (
              <p className="mt-2 text-xs text-destructive">{linkError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showSandboxPrimary || fd.sandboxConnectAvailable) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/10 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-info/10 text-info">
            <Landmark className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Connect a sandbox bank</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plaid sandbox Link uses test credentials only — not live bank
              data.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={!fd.configured || connectBusy}
                onClick={() =>
                  startPlaidConnection({ environment: "sandbox" })
                }
              >
                <Lock className="size-3.5" />
                Connect sandbox bank
              </Button>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" />
                Tokens stay server-side — never stored in your browser.
              </span>
            </div>
            {linkError && (
              <p className="mt-2 text-xs text-destructive">{linkError}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
