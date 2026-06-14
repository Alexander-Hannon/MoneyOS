"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Nav } from "@/components/layout/Nav";
import { NextResponsibleAction } from "@/components/dashboard/NextResponsibleAction";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { CashflowCard } from "@/components/dashboard/CashflowCard";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { SpendingDashboard } from "@/components/spending/SpendingDashboard";
import { SpendingLater } from "@/components/dashboard/SpendingLater";
import { mockFinancials } from "@/lib/data/mock-financials";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { nextResponsibleAction } from "@/lib/money-utils";
import { useFinancialData } from "@/hooks/useFinancialData";
import { incomeVsSpendingTrend } from "@/lib/transaction-utils";

export function Dashboard() {
  const fd = useFinancialData();
  const action = nextResponsibleAction(fd.alerts);
  const { dashboardSummary, spendingSummary, incomeSummary } = fd;

  const cashflowData =
    fd.plaidConnected || fd.storedMode === "demo"
      ? incomeVsSpendingTrend(fd.transactions)
      : undefined;

  const cashflowIncome =
    fd.plaidConnected || fd.storedMode === "demo"
      ? spendingSummary.monthlyIncome
      : fd.isManualEmpty
        ? 0
        : mockFinancials.monthlyIncomeEstimate;

  const cashflowSpending =
    fd.plaidConnected || fd.storedMode === "demo"
      ? spendingSummary.monthlySpending
      : fd.isManualEmpty
        ? 0
        : mockFinancials.monthlySpendingEstimate;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Nav />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <section id="dashboard" className="scroll-mt-20 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              What is the next responsible financial action?
            </p>
            <div className="mt-2">
              <NextResponsibleAction action={action} />
            </div>
            <div className="mt-3">
              <MoneyAgentBrief />
            </div>
          </div>

          <SummaryCards
            bills={fd.bills}
            income={fd.income}
            subscriptions={fd.subscriptions}
            transactionReviewCount={dashboardSummary.transactionReviewCount}
            dataLabel={dashboardSummary.label}
            plaidConnected={fd.plaidConnected}
            storedMode={fd.storedMode}
          />

          <MoneySnapshot
            accounts={fd.accounts}
            bills={fd.bills}
            income={fd.income}
            subscriptions={fd.subscriptions}
            alerts={fd.alerts}
            summary={dashboardSummary}
            incomeSummary={incomeSummary}
            plaidConnected={fd.plaidConnected}
            storedMode={fd.storedMode}
          />

          <CashflowCard
            financials={mockFinancials}
            plaidConnected={fd.plaidConnected}
            storedMode={fd.storedMode}
            isEmpty={fd.isManualEmpty && !fd.plaidConnected}
            monthlyIncome={cashflowIncome}
            monthlySpending={cashflowSpending}
            chartData={cashflowData}
          />
        </section>

        <section id="bills" className="scroll-mt-20">
          <BillsCommandCenter />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section id="income" className="scroll-mt-20">
            <IncomePipeline />
          </section>
          <section id="subscriptions" className="scroll-mt-20">
            <SubscriptionWatchlist />
          </section>
        </div>

        <section id="spending" className="scroll-mt-20">
          <SpendingDashboard />
        </section>

        <section id="alerts" className="scroll-mt-20">
          <MoneyAgentAlerts />
        </section>

        <section id="spending-later" className="scroll-mt-20">
          <SpendingLater items={fd.spendingLater} />
        </section>

        <footer className="flex flex-col items-center gap-1 pt-2 text-center text-xs text-muted-foreground/60">
          <p>
            MoneyOS by Apalym · Development / Sandbox mode · {fd.modeLabel}
          </p>
          <Link href="/settings" className="hover:text-muted-foreground">
            Settings
          </Link>
        </footer>
      </main>
    </div>
  );
}
