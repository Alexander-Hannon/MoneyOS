import { CircleDollarSign, Sparkles } from "lucide-react";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { mockAccounts } from "@/lib/data/mock-accounts";
import { mockBills } from "@/lib/data/mock-bills";
import { mockIncome } from "@/lib/data/mock-income";
import { mockSubscriptions } from "@/lib/data/mock-subscriptions";
import { mockAlerts } from "@/lib/data/mock-alerts";
import { nextResponsibleAction } from "@/lib/money-utils";

// Mock data uses dates relative to "now", so render fresh on each request.
export const dynamic = "force-dynamic";

export default function Dashboard() {
  const action = nextResponsibleAction(mockBills);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-primary/15 text-primary">
              <CircleDollarSign className="size-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Money<span className="text-primary">OS</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">{today}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            AJ Money Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What is the next responsible financial action?
          </p>

          <div className="mt-4 rounded-[var(--radius)] border border-primary/25 bg-gradient-to-br from-primary/15 to-card p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Next responsible action
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {action.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {action.detail}
            </p>
          </div>
        </section>

        <MoneySnapshot
          accounts={mockAccounts}
          bills={mockBills}
          income={mockIncome}
          subscriptions={mockSubscriptions}
        />

        <BillsCommandCenter bills={mockBills} />

        <div className="grid gap-6 lg:grid-cols-2">
          <IncomePipeline income={mockIncome} />
          <SubscriptionWatchlist subscriptions={mockSubscriptions} />
        </div>

        <MoneyAgentAlerts alerts={mockAlerts} />

        <footer className="pt-2 text-center text-xs text-muted-foreground/60">
          MoneyOS · local mock data · no bank connections
        </footer>
      </main>
    </div>
  );
}
