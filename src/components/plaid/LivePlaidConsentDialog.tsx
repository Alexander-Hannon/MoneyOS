"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const CONFIRMATION_TEXT = "CONNECT REAL DATA";

export function LivePlaidConsentDialog({
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
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");

  const canContinue =
    checked && typed.trim().toUpperCase() === CONFIRMATION_TEXT;

  const handleClose = () => {
    setChecked(false);
    setTyped("");
    onClose();
  };

  const handleAccept = () => {
    if (!canContinue) return;
    setChecked(false);
    setTyped("");
    onAccept();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Connect real financial accounts?"
      description="Read-only access to your accounts through Plaid. MoneyOS can’t move money."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 p-3 text-warning">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            This will connect real bank, credit, investment, and liability data
            through Plaid Production. This is not public SaaS launch.
          </span>
        </p>

        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            MoneyOS will read balances, transactions, recurring charges,
            liabilities, and/or investments depending on enabled Plaid products.
          </li>
          <li>MoneyOS does not move money or pay bills.</li>
          <li>Access tokens are encrypted server-side only.</li>
          <li>You can disconnect accounts at any time.</li>
          <li>This is private personal use, not public production.</li>
        </ul>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-muted/20 p-3 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          Plaid access tokens stay on the server and are never stored in your
          browser or localStorage.
        </p>

        <label className="flex items-start gap-2 text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I understand this connects real financial data.</span>
        </label>

        <div className="space-y-1.5">
          <label htmlFor="live-plaid-confirm" className="text-xs font-medium text-foreground">
            Type {CONFIRMATION_TEXT} to continue
          </label>
          <input
            id="live-plaid-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder={CONFIRMATION_TEXT}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={busy || !canContinue} onClick={handleAccept}>
            Continue to Plaid Link
          </Button>
          <Button size="sm" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
