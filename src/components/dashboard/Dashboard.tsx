"use client";

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
import { mockSpendingLater } from "@/lib/data/mock-spending-later";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { nextResponsibleAction } from "@/lib/money-utils";
import { useFinancialData } from "@/hooks/useFinancialData";
import { incomeVsSpendingTrend } from "@/lib/transaction-utils";

export function Dashboard() {
  const fd = useFinancialData();
  const action = nextResponsibleAction(fd.alerts);
  const { dashboardSummary, spendingSummary, incomeSummary } = fd;

  const cashflowData = fd.plaidConnected
    ? incomeVsSpendingTrend(fd.transactions)
    : undefined;

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
          />

          <CashflowCard
            financials={mockFinancials}
            plaidConnected={fd.plaidConnected}
            monthlyIncome={
              fd.plaidConnected
                ? spendingSummary.monthlyIncome
                : mockFinancials.monthlyIncomeEstimate
            }
            monthlySpending={
              fd.plaidConnected
                ? spendingSummary.monthlySpending
                : mockFinancials.monthlySpendingEstimate
            }
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
          <SpendingLater items={mockSpendingLater} />
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground/60">
          MoneyOS by Apalym · Development / Sandbox mode
          {fd.plaidConnected ? " · Plaid sandbox data" : " · Demo / manual data"}
        </footer>
      </main>
    </div>
  );
}
