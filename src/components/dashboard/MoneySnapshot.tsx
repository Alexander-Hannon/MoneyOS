import {
  Banknote,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { cashflowTrend, formatCurrency, type MoneySnapshot as Snapshot } from "@/lib/finance";

function Stat({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function MoneySnapshot({ snapshot }: { snapshot: Snapshot }) {
  const positive = snapshot.netCashflow >= 0;
  const trend = cashflowTrend(snapshot);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Total balance"
          value={formatCurrency(snapshot.totalBalance)}
          icon={Banknote}
          accent="text-primary"
          hint="across all accounts"
        />
        <Stat
          label="Safe to spend"
          value={formatCurrency(snapshot.safeToSpend)}
          icon={PiggyBank}
          accent={snapshot.safeToSpend >= 0 ? "text-primary" : "text-destructive"}
          hint="after upcoming bills"
        />
        <Stat
          label="Monthly bills"
          value={formatCurrency(snapshot.monthlyBills)}
          icon={Receipt}
          accent="text-warning"
          hint={`+ ${formatCurrency(snapshot.monthlySubscriptions)} subscriptions`}
        />
        <Stat
          label="Net cashflow"
          value={`${positive ? "+" : "-"}${formatCurrency(Math.abs(snapshot.netCashflow))}`}
          icon={positive ? TrendingUp : TrendingDown}
          accent={positive ? "text-primary" : "text-destructive"}
          hint={`${(snapshot.savingsRate * 100).toFixed(0)}% savings rate`}
        />
      </div>

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cashflow trend</p>
            <p className="text-xs text-muted-foreground">Income vs. spending · last 6 months</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-destructive" /> Spending
            </span>
          </div>
        </div>
        <CashflowChart data={trend} />
      </Card>
    </section>
  );
}
