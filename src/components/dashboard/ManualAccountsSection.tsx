"use client";

import { useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { AccountForm } from "@/components/forms/AccountForm";
import { RowActions } from "@/components/shared/RowActions";
import { useMoneyData } from "@/lib/storage/store";
import { useFinancialData } from "@/hooks/useFinancialData";
import { formatCurrency } from "@/lib/money-utils";
import { useToast } from "@/components/ui/toast";
import type { Account } from "@/types/money";

export function ManualAccountsSection() {
  const money = useMoneyData();
  const fd = useFinancialData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  if (fd.storedMode === "demo" && !fd.plaidConnected) return null;

  const isPersonalLive =
    fd.effectiveMode === "personal_live" ||
    fd.activePlaidEnvironment === "production";

  const accounts = money.manualAccounts;
  const title = isPersonalLive
    ? "Manual Cash & Accounts — optional"
    : "Cash & Accounts";
  const description = isPersonalLive
    ? "Add off-bank cash or manually tracked accounts. Connected live bank accounts are shown above."
    : "Manual balances for local user mode — not connected to a bank.";
  const emptyTitle = isPersonalLive
    ? "No manual cash accounts added"
    : "No cash accounts added yet.";
  const emptyDescription = isPersonalLive
    ? "Your connected live bank accounts are listed above."
    : "Add checking, savings, or cash balances to track total cash available.";

  return (
    <Card id="accounts">
      <CardContent className="pt-5">
        <SectionHeader
          icon={Landmark}
          title={title}
          description={description}
          meta={
            <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="size-3.5" /> Add account
            </Button>
          }
        />

        {accounts.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.type}
                    {account.institution ? ` · ${account.institution}` : ""}
                    {account.accessible ? " · counts toward cash" : " · excluded from cash"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium num">
                    {formatCurrency(account.availableBalance ?? account.balance)}
                  </span>
                  <RowActions
                    label={account.name}
                    onEdit={() => { setEditing(account); setOpen(true); }}
                    onDelete={() => {
                      money.deleteManualAccount(account.id);
                      toast("Account removed");
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog
          open={open}
          onClose={() => { setOpen(false); setEditing(null); }}
          title={editing ? "Edit account" : "Add manual account"}
        >
          <AccountForm
            initial={editing ?? undefined}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={(draft) => {
              if (editing) {
                money.updateManualAccount(editing.id, draft);
                toast("Account updated");
              } else {
                money.addManualAccount(draft);
                toast("Account added");
              }
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </CardContent>
    </Card>
  );
}
