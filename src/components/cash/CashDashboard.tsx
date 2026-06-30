"use client";

import { Banknote, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CashAllocationChart } from "@/components/cash/CashAllocationChart";
import { RefreshLiveBalancesButton } from "@/components/plaid/RefreshLiveBalancesButton";
import { ManualAccountsSection } from "@/components/dashboard/ManualAccountsSection";
import { useFinancialData } from "@/hooks/useFinancialData";
import {
  buildCashBreakdown,
  maskSafeAccountName,
} from "@/lib/cash-breakdown";
import { formatCurrency } from "@/lib/money-utils";
import { isLivePlaidEnvironment } from "@/lib/plaid-ui-labels";

export function CashDashboard() {
  const fd = useFinancialData();
  const isLive = isLivePlaidEnvironment(fd.activePlaidEnvironment);
  const breakdown = buildCashBreakdown({
    accounts: fd.accounts,
    linkedAccounts: fd.linkedAccounts,
    cashDataSource: fd.dashboardSummary.cashDataSource,
  });

  const liveCashAccounts = breakdown.cashAccounts.filter((row) => !row.isManual);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 pt-5">
          <SectionHeader
            icon={Banknote}
            title="Total cash available"
            description="Checking, savings, high-yield savings, and manual cash-like balances only"
            meta={
              <StatusBadge
                label={breakdown.dataSourceLabel}
                tone={isLive ? "warning" : "neutral"}
              />
            }
          />
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {formatCurrency(breakdown.totalCashAvailable)}
          </p>
          {breakdown.buckets.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {breakdown.buckets.map((bucket) => (
                <li
                  key={bucket.key}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(bucket.total, true)} · {bucket.accountCount}{" "}
                    acct{bucket.accountCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {isLive && fd.liveConnected ? (
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Landmark}
              title="Live balance refresh"
              description="Manual refresh only — shared 24h quota across devices"
            />
            <RefreshLiveBalancesButton />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Landmark}
              title="Cash allocation"
              description="Current balances by account — no historical trend"
            />
            {breakdown.cashAccounts.length > 0 ? (
              <CashAllocationChart accounts={breakdown.cashAccounts} />
            ) : (
              <EmptyState
                icon={Banknote}
                title="No cash accounts to chart"
                description="Connect a bank or add manual cash accounts."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Landmark}
              title="Balance breakdown"
              description="Mask-safe names only"
            />
            {breakdown.cashAccounts.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="No cash accounts yet"
                description="Connected checking/savings and manual cash accounts appear here."
              />
            ) : (
              <ul className="space-y-2">
                {breakdown.cashAccounts.map((account) => (
                  <li
                    key={account.id}
                    className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {maskSafeAccountName(account.name, account.mask)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.institution} · {account.typeLabel}
                        </p>
                        <StatusBadge
                          label={account.sourceLabel}
                          tone={account.isLive ? "warning" : "neutral"}
                          className="mt-1"
                        />
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold tabular-nums">
                          {formatCurrency(account.currentBalance)}
                        </p>
                        {account.availableBalance != null &&
                        account.availableBalance !== account.currentBalance ? (
                          <p className="text-xs text-muted-foreground">
                            Available {formatCurrency(account.availableBalance)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {liveCashAccounts.length > 0 ? (
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Landmark}
              title="Connected live accounts"
              description="Balances from your linked bank connection"
            />
            <p className="mb-3 text-xs text-muted-foreground">
              {liveCashAccounts.length} cash account
              {liveCashAccounts.length === 1 ? "" : "s"} included in total cash
              available.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {fd.plaidConnected && fd.linkedAccounts.length > 0 && liveCashAccounts.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              icon={Landmark}
              title="No checking or savings in linked accounts"
              description="Credit, loan, and investment accounts are listed below and excluded from cash available."
            />
          </CardContent>
        </Card>
      ) : null}

      {breakdown.excludedAccounts.length > 0 ? (
        <Card>
          <CardContent className="pt-5">
            <SectionHeader
              icon={Landmark}
              title="Excluded from cash available"
              description="Credit cards, loans, investments, and other non-cash accounts"
            />
            <ul className="space-y-2">
              {breakdown.excludedAccounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border/60 bg-muted/10 px-3 py-2 text-sm"
                >
                  <span>
                    {maskSafeAccountName(account.name, account.mask)} ·{" "}
                    {account.typeLabel}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(account.currentBalance)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <ManualAccountsSection />
    </div>
  );
}
