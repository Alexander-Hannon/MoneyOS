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
import { mockAccounts } from "@/lib/data/mock-accounts";
import { mockFinancials } from "@/lib/data/mock-financials";
import { mockSpendingLater } from "@/lib/data/mock-spending-later";
import { nextResponsibleAction } from "@/lib/money-utils";
import { useMoneyData } from "@/lib/storage/store";

export function Dashboard() {
  const { bills, income, subscriptions, alerts } = useMoneyData();
  const action = nextResponsibleAction(alerts);

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
          </div>

          <SummaryCards
            bills={bills}
            income={income}
            subscriptions={subscriptions}
          />

          <MoneySnapshot
            accounts={mockAccounts}
            bills={bills}
            income={income}
            subscriptions={subscriptions}
            alerts={alerts}
          />

          <CashflowCard financials={mockFinancials} />
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
          MoneyOS · local mock data, editable in your browser · no bank
          connections, no accounts stored
        </footer>
      </main>
    </div>
  );
}
