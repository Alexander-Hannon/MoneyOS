"use client";

import { Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFinancialData } from "@/hooks/useFinancialData";
import { institutionEnvironmentLabel, isLivePlaidEnvironment } from "@/lib/plaid-ui-labels";
import { RefreshLiveBalancesButton } from "@/components/plaid/RefreshLiveBalancesButton";
import { formatCurrency } from "@/lib/money-utils";

function formatAccountName(name: string, mask?: string): string {
  if (mask) return `${name} ••${mask}`;
  return name;
}

function accountTypeLabel(type: string, subtype?: string): string {
  if (subtype) return `${type} / ${subtype}`;
  return type;
}

export function LiveAccountsSection() {
  const fd = useFinancialData();
  const isLive = isLivePlaidEnvironment(fd.activePlaidEnvironment);
  const accounts = fd.linkedAccounts;

  if (!fd.plaidConnected || accounts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Landmark}
          title={isLive ? "Live bank accounts" : "Connected accounts"}
          description={
            isLive
              ? "Mask-safe account list from personal live Plaid data"
              : "Mask-safe account list from Plaid sandbox"
          }
          meta={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
        />

        {isLive && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-warning/20 bg-warning/5 p-3">
            <RefreshLiveBalancesButton variant="secondary" />
          </div>
        )}

        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {formatAccountName(account.name, account.mask)}
                    </p>
                    <StatusBadge
                      label={institutionEnvironmentLabel({
                        environment: fd.activePlaidEnvironment,
                        source:
                          account.source === "plaid_live" ||
                          account.source === "plaid_sandbox"
                            ? account.source
                            : fd.activePlaidEnvironment === "production"
                              ? "plaid_live"
                              : "plaid_sandbox",
                      })}
                      tone={isLive ? "warning" : "info"}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {account.institution} ·{" "}
                    {accountTypeLabel(account.type, account.subtype)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(
                      account.currentBalance ??
                        account.availableBalance ??
                        0,
                    )}
                  </p>
                  {account.availableBalance != null &&
                    account.currentBalance != null &&
                    account.availableBalance !== account.currentBalance && (
                      <p className="text-xs text-muted-foreground">
                        Available {formatCurrency(account.availableBalance)}
                      </p>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {isLive && accounts.every((a) => !["checking", "savings", "cash"].includes(a.type)) && (
          <div className="mt-3">
            <EmptyState
              icon={Landmark}
              title="No checking/savings in linked accounts"
              description="Credit, loan, or investment accounts are shown here but excluded from Total Cash Available."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
