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

export function ConnectBankCard() {
  const fd = useFinancialData();
  const appMode = useAppMode();

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

  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/10 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-info/10 text-info">
          <Landmark className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Connect a sandbox bank</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plaid Link opens from the header Connect bank menu so the Plaid script
            is only loaded once.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={!fd.configured || fd.busy}
              onClick={() => appMode.requestPlaidConnect()}
            >
              <Lock className="size-3.5" />
              Connect sandbox bank
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
