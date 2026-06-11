import { Topbar } from "@/components/dashboard/Topbar";
import { NextActionCard } from "@/components/dashboard/NextActionCard";
import { MoneySnapshot } from "@/components/dashboard/MoneySnapshot";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";
import { SubscriptionWatchlist } from "@/components/dashboard/SubscriptionWatchlist";
import { MoneyAgentAlerts } from "@/components/dashboard/MoneyAgentAlerts";
import { getMockData } from "@/lib/mock-data";
import { buildAlerts, buildSnapshot } from "@/lib/finance";

// Mock data uses dates relative to "now", so render on each request.
export const dynamic = "force-dynamic";

export default function Dashboard() {
  const data = getMockData();
  const snapshot = buildSnapshot(data);
  const alerts = buildAlerts(data);
  const nextAction = alerts[0];

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <NextActionCard action={nextAction} />

        <MoneySnapshot snapshot={snapshot} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BillsCommandCenter bills={data.bills} />
          </div>
          <MoneyAgentAlerts alerts={alerts} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <IncomePipeline income={data.income} />
          <SubscriptionWatchlist subscriptions={data.subscriptions} />
        </div>
      </main>
    </div>
  );
}
