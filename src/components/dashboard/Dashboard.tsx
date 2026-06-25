"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Nav } from "@/components/layout/Nav";
import { DataConfidenceStrip } from "@/components/shared/DataConfidenceStrip";
import { NextResponsibleAction } from "@/components/dashboard/NextResponsibleAction";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { CashflowCard } from "@/components/dashboard/CashflowCard";
import { LiveAccountsSection } from "@/components/dashboard/LiveAccountsSection";
import { ManualAccountsSection } from "@/components/dashboard/ManualAccountsSection";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { SpendingDashboard } from "@/components/spending/SpendingDashboard";
import { DashboardHashScroll } from "@/components/dashboard/DashboardHashScroll";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { DetectedRecurringItems } from "@/components/dashboard/DetectedRecurringItems";
import { ConnectedInstitutionsSection } from "@/components/dashboard/ConnectedInstitutionsSection";
import { SpendingLater } from "@/components/dashboard/SpendingLater";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { nextResponsibleAction } from "@/lib/money-utils";
import { useFinancialData } from "@/hooks/useFinancialData";
import { dashboardModeLabels } from "@/lib/data-source";
import { resolveChartPresentationInfo } from "@/lib/chart-presentation";
import { resolveCashflowTrend } from "@/lib/chart-trends";
import {
  computeManualMonthlyProjection,
  resolveChartDataSource,
} from "@/lib/chart-data";

export function Dashboard() {
  const fd = useFinancialData();
  const action = nextResponsibleAction(fd.alerts);
  const { dashboardSummary } = fd;

  const hasManualIncomeOrBills =
    fd.income.length > 0 || fd.bills.length > 0 || fd.subscriptions.length > 0;

  const chartDataSource = resolveChartDataSource({
    storedMode: fd.storedMode,
    plaidConnected: fd.plaidConnected,
    activePlaidEnvironment: fd.activePlaidEnvironment,
    transactions: fd.transactions,
    hasManualIncomeOrBills,
  });

  const allowSyntheticFallback =
    chartDataSource === "demo" || chartDataSource === "plaid_sandbox";

  const trendPoints = resolveCashflowTrend({
    transactions: fd.transactions,
    allowSyntheticFallback,
  });

  const chartPresentation = resolveChartPresentationInfo({
    chartDataSource,
    trendPoints,
  });

  const trendData = trendPoints.map(({ month, income, spending }) => ({
    month,
    income,
    spending,
  }));

  const projection =
    chartPresentation.kind === "manual_projection"
      ? computeManualMonthlyProjection({
          income: fd.income,
          bills: fd.bills,
          subscriptions: fd.subscriptions,
        })
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHashScroll />
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
            activePlaidEnvironment={fd.activePlaidEnvironment}
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
            activePlaidEnvironment={fd.activePlaidEnvironment}
          />

          <LiveAccountsSection />

          <DataConfidenceStrip />

          {fd.activePlaidEnvironment === "production" && (
            <div className="flex flex-wrap gap-2">
              {dashboardModeLabels(fd.activePlaidEnvironment).map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

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
          <Suspense fallback={null}>
            <SpendingDashboard />
          </Suspense>
        </section>

        <section id="action-center" className="scroll-mt-20">
          <ActionCenter />
        </section>

        <section id="alerts" className="scroll-mt-20">
          <MoneyAgentAlerts />
        </section>

        <section id="subscriptions-recurring-detected" className="scroll-mt-20">
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
            MoneyOS by Apalym ·{" "}
            {fd.activePlaidEnvironment === "production"
              ? "Personal Live · Private owner mode"
              : "Development / Sandbox mode"}{" "}
            · {fd.modeLabel}
          </p>
          <Link href="/settings" className="hover:text-muted-foreground">
            Settings
          </Link>
        </footer>
      </main>
    </div>
  );
}
