"use client";

import { DataConfidenceStrip } from "@/components/shared/DataConfidenceStrip";
import { NextResponsibleAction } from "@/components/dashboard/NextResponsibleAction";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { CashflowCard } from "@/components/dashboard/CashflowCard";
import { LiveAccountsSection } from "@/components/dashboard/LiveAccountsSection";
import { ManualAccountsSection } from "@/components/dashboard/ManualAccountsSection";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { DashboardHashScroll } from "@/components/dashboard/DashboardHashScroll";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { ConnectedInstitutionsSection } from "@/components/dashboard/ConnectedInstitutionsSection";
import { MoneyAgentBrief } from "@/components/ai/MoneyAgentBrief";
import { AppShell } from "@/components/layout/AppShell";
import { RunwayPanel } from "@/components/runway/RunwayPanel";
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
    <AppShell>
      <DashboardHashScroll />

      <section id="dashboard" className="scroll-mt-20 space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <h1 className="text-sm text-muted-foreground">
              What is the next responsible financial action?
            </h1>
            <NextResponsibleAction action={action} />
          </div>
          <div className="xl:pt-8">
            <MoneyAgentBrief />
          </div>
        </div>

        <RunwayPanel compact />

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
                className="rounded-[3px] border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section id="action-center" className="min-w-0 scroll-mt-20">
          <ActionCenter />
        </section>
        <section id="alerts" className="min-w-0 scroll-mt-20">
          <MoneyAgentAlerts />
        </section>
      </div>

      <section id="institutions" className="scroll-mt-20">
        <ConnectedInstitutionsSection />
      </section>

      <footer className="pt-2 text-center text-xs text-muted-foreground/60">
        MoneyOS by Apalym.{" "}
        {fd.activePlaidEnvironment === "production"
          ? "Personal Live, private owner mode."
          : "Development / Sandbox mode."}{" "}
        Data: {fd.modeLabel}.
      </footer>
    </AppShell>
  );
}
