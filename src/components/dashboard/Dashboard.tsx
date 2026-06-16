"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Nav } from "@/components/layout/Nav";
import { DataConfidenceStrip } from "@/components/shared/DataConfidenceStrip";
import { NextResponsibleAction } from "@/components/dashboard/NextResponsibleAction";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { CashflowCard } from "@/components/dashboard/CashflowCard";
import { ManualAccountsSection } from "@/components/dashboard/ManualAccountsSection";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { SpendingDashboard } from "@/components/spending/SpendingDashboard";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { DetectedRecurringItems } from "@/components/dashboard/DetectedRecurringItems";
import { ConnectedInstitutionsSection } from "@/components/dashboard/ConnectedInstitutionsSection";
import { SpendingLater } from "@/components/dashboard/SpendingLater";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { nextResponsibleAction } from "@/lib/money-utils";
import { useFinancialData } from "@/hooks/useFinancialData";
import { incomeVsSpendingTrend } from "@/lib/transaction-utils";
import {
  computeManualMonthlyProjection,
  hasHistoricalTransactionData,
  resolveChartDataSource,
  resolveChartPresentation,
} from "@/lib/chart-data";

export function Dashboard() {
  const fd = useFinancialData();
  const action = nextResponsibleAction(fd.alerts);
  const { dashboardSummary } = fd;

  const hasManualIncomeOrBills =
    fd.income.length > 0 || fd.bills.length > 0 || fd.subscriptions.length > 0;

  const hasHistorical = hasHistoricalTransactionData(
    fd.transactions,
    fd.storedMode,
    fd.plaidConnected,
  );

  const chartDataSource = resolveChartDataSource({
    storedMode: fd.storedMode,
    plaidConnected: fd.plaidConnected,
    transactions: fd.transactions,
    hasManualIncomeOrBills,
  });

  const chartPresentation = resolveChartPresentation({
    chartDataSource,
    hasHistorical,
  });

  const trendData =
    hasHistorical && (fd.plaidConnected || fd.storedMode === "demo")
      ? incomeVsSpendingTrend(fd.transactions)
      : undefined;

  const projection =
    chartPresentation === "manual_projection"
      ? computeManualMonthlyProjection({
          income: fd.income,
          bills: fd.bills,
          subscriptions: fd.subscriptions,
        })
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Nav />

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
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
            reviewCount={fd.syncedReviewCount}
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
            incomeSummary={fd.incomeSummary}
            plaidConnected={fd.plaidConnected}
            storedMode={fd.storedMode}
          />

          <DataConfidenceStrip />

          <CashflowCard
            presentation={chartPresentation}
            chartDataSource={chartDataSource}
            trendData={trendData}
            projection={projection}
          />

          <ManualAccountsSection />
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

        <section id="action-center" className="scroll-mt-20">
          <ActionCenter />
        </section>

        <section id="alerts" className="scroll-mt-20">
          <MoneyAgentAlerts />
        </section>

        <section id="recurring-detected" className="scroll-mt-20">
          <DetectedRecurringItems />
        </section>

        <section id="institutions" className="scroll-mt-20">
          <ConnectedInstitutionsSection />
        </section>

        <section id="spending-later" className="scroll-mt-20">
          <SpendingLater />
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
