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
import { SpendingLater } from "@/components/dashboard/SpendingLater";
import { mockAccounts } from "@/lib/data/mock-accounts";
import { mockBills } from "@/lib/data/mock-bills";
import { mockIncome } from "@/lib/data/mock-income";
import { mockSubscriptions } from "@/lib/data/mock-subscriptions";
import { mockAlerts } from "@/lib/data/mock-alerts";
import { mockFinancials } from "@/lib/data/mock-financials";
import { mockSpendingLater } from "@/lib/data/mock-spending-later";
import { nextResponsibleAction } from "@/lib/money-utils";

// Mock data uses dates relative to "now", so render fresh on each request.
export const dynamic = "force-dynamic";

export default function Dashboard() {
  const action = nextResponsibleAction(mockAlerts);

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
            bills={mockBills}
            income={mockIncome}
            subscriptions={mockSubscriptions}
          />

          <MoneySnapshot
            accounts={mockAccounts}
            bills={mockBills}
            income={mockIncome}
            subscriptions={mockSubscriptions}
            alerts={mockAlerts}
          />

          <CashflowCard financials={mockFinancials} />
        </section>

        <section id="bills" className="scroll-mt-20">
          <BillsCommandCenter bills={mockBills} />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section id="income" className="scroll-mt-20">
            <IncomePipeline income={mockIncome} />
          </section>
          <section id="subscriptions" className="scroll-mt-20">
            <SubscriptionWatchlist subscriptions={mockSubscriptions} />
          </section>
        </div>

        <section id="alerts" className="scroll-mt-20">
          <MoneyAgentAlerts alerts={mockAlerts} />
        </section>

        <section id="spending-later" className="scroll-mt-20">
          <SpendingLater items={mockSpendingLater} />
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground/60">
          MoneyOS · local mock data · no bank connections, no accounts stored
        </footer>
      </main>
    </div>
  );
}
