"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function PlaidConsentDialog({
  open,
  onClose,
  onAccept,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connect via Plaid (sandbox)"
      description="Review before linking a test bank account."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          MoneyOS connects to Plaid to retrieve account balances, transactions,
          recurring transactions, liabilities, and investment data (when
          available).
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Data is used to show financial dashboards, spending categories,
            recurring payments, alerts, and review items.
          </li>
          <li>MoneyOS does not initiate payments or move money.</li>
          <li>
            You can disconnect accounts and request deletion (see Privacy Policy).
          </li>
          <li>
            <strong className="text-foreground">Sandbox mode only</strong> — for
            development and testing. Not live bank data.
          </li>
        </ul>
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Plaid access tokens stay on the server and are never stored in your
          browser or localStorage.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={busy} onClick={onAccept}>
            I understand — continue to Plaid Link
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          By continuing you acknowledge the{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy (draft)
          </a>{" "}
          and{" "}
          <a href="/terms" className="text-primary hover:underline">
            Terms (draft)
          </a>
          .
        </p>
      </div>
    </Dialog>
  );
}
