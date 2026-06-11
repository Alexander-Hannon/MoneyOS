import { prisma } from "@/lib/prisma";
import {
  buildSpendingAlerts,
  formatCurrency,
  monthlySubscriptionAmount,
  netCashflow,
  totalMonthlyBills,
  totalMonthlyIncome,
  totalMonthlyOutflow,
  totalMonthlySubscriptions,
  type FinanceSnapshot,
  type Severity,
} from "@/lib/finance";
import { AddEntryForms } from "@/components/AddEntryForms";
import { MoneyAgentPanel } from "@/components/MoneyAgentPanel";

// The dashboard reads live data on every request; don't prerender at build time.
export const dynamic = "force-dynamic";

const severityStyles: Record<Severity, string> = {
  info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

export default async function Dashboard() {
  const [bills, income, subscriptions] = await Promise.all([
    prisma.bill.findMany({ orderBy: { dueDay: "asc" } }),
    prisma.income.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscription.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const snapshot: FinanceSnapshot = { bills, income, subscriptions };
  const alerts = buildSpendingAlerts(snapshot);
  const net = netCashflow(snapshot);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Money<span className="text-sky-400">OS</span>
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Private personal finance dashboard — bills, income, subscriptions,
          spending alerts &amp; Money Agent reviews.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Monthly income" value={totalMonthlyIncome(snapshot)} accent="text-emerald-400" />
        <StatCard label="Bills" value={totalMonthlyBills(snapshot)} accent="text-amber-300" />
        <StatCard label="Subscriptions" value={totalMonthlySubscriptions(snapshot)} accent="text-fuchsia-300" />
        <StatCard
          label="Net cashflow"
          value={net}
          accent={net >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="mb-3 text-lg font-semibold">Spending alerts</h2>
            <ul data-testid="alerts" className="space-y-2">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-xl border px-4 py-3 text-sm ${severityStyles[a.severity]}`}
                >
                  <p className="font-semibold">{a.title}</p>
                  <p className="opacity-80">{a.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <ListCard title="Bills" empty="No bills yet.">
              {bills.map((b) => (
                <Row
                  key={b.id}
                  name={b.name}
                  meta={`Due ${ordinal(b.dueDay)} · ${b.category}${b.autopay ? " · autopay" : ""}`}
                  value={formatCurrency(b.amount)}
                />
              ))}
            </ListCard>

            <ListCard title="Income" empty="No income yet.">
              {income.map((i) => (
                <Row
                  key={i.id}
                  name={i.source}
                  meta={i.frequency}
                  value={formatCurrency(i.amount)}
                />
              ))}
            </ListCard>

            <ListCard title="Subscriptions" empty="No subscriptions yet." className="md:col-span-2">
              {subscriptions.map((s) => (
                <Row
                  key={s.id}
                  name={s.name}
                  meta={`${s.billingCycle} · ${s.category} · ${formatCurrency(monthlySubscriptionAmount(s))}/mo`}
                  value={formatCurrency(s.amount)}
                />
              ))}
            </ListCard>
          </div>
        </div>

        <div className="space-y-6">
          <MoneyAgentPanel />
          <AddEntryForms />
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-white/30">
        Outflow {formatCurrency(totalMonthlyOutflow(snapshot))}/mo · data stored
        locally in SQLite
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function ListCard({
  title,
  empty,
  className = "",
  children,
}: {
  title: string;
  empty: string;
  className?: string;
  children: React.ReactNode[];
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur ${className}`}
    >
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-white/50">{empty}</p>
      ) : (
        <ul className="divide-y divide-white/5">{children}</ul>
      )}
    </section>
  );
}

function Row({
  name,
  meta,
  value,
}: {
  name: string;
  meta: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs capitalize text-white/50">{meta}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
