"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { PaceChart } from "@/components/plan/PaceChart";
import { useSpendingPlan } from "@/hooks/useSpendingPlan";
import { formatCurrency } from "@/lib/money-utils";
import type { PlanCategory, SpendingPlanSettings } from "@/lib/spending-plan";
import { cn } from "@/lib/utils";

const money = (n: number) => formatCurrency(n, true);
const whole = (n: number) => formatCurrency(n);

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Text input that commits a dollar amount on blur or Enter. */
function MoneyInput({
  id,
  value,
  onCommit,
  placeholder,
  className,
  label,
}: {
  id: string;
  value: number | null;
  onCommit: (n: number | null) => void;
  placeholder?: string;
  className?: string;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? "" : String(value));
  const commit = () => {
    if (draft == null) return;
    const cleaned = draft.replace(/[$,\s]/g, "");
    if (cleaned === "") onCommit(null);
    else {
      const n = Number(cleaned);
      if (Number.isFinite(n) && n >= 0) onCommit(Math.round(n * 100) / 100);
    }
    setDraft(null);
  };
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="decimal"
      value={shown}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
      className={cn(
        "num h-8 rounded-[var(--radius-sm)] border border-input bg-background px-2.5 text-sm outline-none focus:border-primary",
        className,
      )}
    />
  );
}

function Term({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("num mt-0.5 truncate text-base sm:text-lg", tone)}>{value}</p>
    </div>
  );
}

function Operator({ children }: { children: string }) {
  return (
    <span aria-hidden className="num self-end pb-0.5 text-lg text-muted-foreground/60">
      {children}
    </span>
  );
}

function CategoryRow({
  row,
  onCap,
}: {
  row: PlanCategory;
  onCap: (cap: number | null) => void;
}) {
  const reference = row.cap ?? (row.lastMonth > 0 ? row.lastMonth : null);
  const pct = reference ? Math.min(100, (row.spent / reference) * 100) : 0;
  const over = row.cap != null && row.spent > row.cap;
  const inputId = `cap-${row.category.replace(/\W+/g, "-")}`;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm">{row.category}</p>
        <p className="text-xs text-muted-foreground">
          {row.count} {row.count === 1 ? "transaction" : "transactions"}
          {row.lastMonth > 0 ? `, ${whole(row.lastMonth)} last month` : ""}
        </p>
      </div>
      <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className={cn("num", over ? "text-destructive" : "text-foreground")}>{money(row.spent)}</span>
          <span className="text-muted-foreground">
            {row.cap != null
              ? over
                ? `${whole(row.spent - row.cap)} over your cap`
                : `${whole(row.cap - row.spent)} left of cap`
              : row.lastMonth > 0
                ? "vs. last month"
                : "No cap"}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full", over ? "bg-destructive" : row.cap != null ? "bg-primary" : "bg-muted-foreground/50")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs text-muted-foreground">
          Cap
        </label>
        <MoneyInput
          id={inputId}
          label={`Monthly cap for ${row.category}`}
          value={row.cap}
          placeholder="None"
          onCommit={onCap}
          className="w-24"
        />
      </div>
    </li>
  );
}

export function SpendingPlanPageClient() {
  const sp = useSpendingPlan();
  const { plan, settings } = sp;

  const update = (patch: Partial<SpendingPlanSettings>) => void sp.save({ ...settings, ...patch });
  const setCap = (category: string, cap: number | null) => {
    const caps = { ...settings.categoryCaps };
    if (cap == null || cap <= 0) delete caps[category];
    else caps[category] = cap;
    update({ categoryCaps: caps });
  };

  let body: React.ReactNode;
  if (sp.loading) {
    body = <Card className="h-[520px] animate-pulse" aria-label="Loading spending plan" />;
  } else {
    const noIncome = plan.expectedIncome <= 0;
    const overPace = plan.paceDelta > 0;
    const negativeFlex = plan.flexBudget < 0;

    body = (
      <>
        {sp.error ? (
          <p role="alert" className="rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sp.error}
          </p>
        ) : null}

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">{monthLabel(plan.month)}</h2>
            <p className="num text-xs text-muted-foreground">
              Day {plan.dayOfMonth} of {plan.daysInMonth}
            </p>
          </div>

          <div className="grid gap-6 px-5 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div>
              <p className="text-xs text-muted-foreground">Left to spend this month</p>
              <AnimatedNumber
                value={plan.flexRemaining}
                format={money}
                className={cn(
                  "mt-1 block text-4xl font-medium tracking-tight sm:text-5xl",
                  plan.flexRemaining < 0 && "text-destructive",
                )}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="num text-foreground">{money(plan.dailyAllowance)}</span> a day for the{" "}
                {plan.daysLeft} days left
              </p>
              {noIncome ? (
                <p className="mt-4 flex items-start gap-2 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    Add your income sources to build a plan.{" "}
                    <Link href="/income" className="underline">Go to Income</Link>
                  </span>
                </p>
              ) : negativeFlex ? (
                <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>Fixed costs and savings are more than your expected income. Lower the savings target or review bills.</span>
                </p>
              ) : (
                <p className={cn("mt-4 flex items-start gap-2 text-sm", overPace ? "text-warning" : "text-success")}>
                  {overPace ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
                  <span>
                    {overPace
                      ? `${whole(plan.paceDelta)} ahead of an even pace for day ${plan.dayOfMonth}.`
                      : `${whole(-plan.paceDelta)} under an even pace for day ${plan.dayOfMonth}.`}
                  </span>
                </p>
              )}
            </div>

            <div className="self-start rounded-[var(--radius-sm)] border border-border bg-background/40 p-4">
              <p className="text-xs text-muted-foreground">How the plan adds up</p>
              <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-3">
                <Term label="Expected income" value={whole(plan.expectedIncome)} />
                <Operator>−</Operator>
                <Term label="Fixed" value={whole(plan.fixedTotal)} />
                <Operator>−</Operator>
                <Term label="Savings" value={whole(plan.savingsTarget)} />
                <Operator>=</Operator>
                <Term label="Flexible" value={whole(plan.flexBudget)} tone={negativeFlex ? "text-destructive" : "text-primary"} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Expected income is the monthly equivalent of your active income sources. So far this
                month <span className="num">{whole(plan.receivedIncome)}</span> has arrived.
              </p>
            </div>
          </div>

          <div className="px-2 pb-3 pt-5 sm:px-3">
            {sp.hasTransactions ? (
              <PaceChart points={plan.pace} dayOfMonth={plan.dayOfMonth} />
            ) : (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                Connect a bank to track spending against your plan.
              </p>
            )}
          </div>

          <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            Spent counts real {sp.transactionsLabel} transactions that aren’t linked to a bill or subscription.
            {plan.unreviewed.count > 0 ? (
              <>
                {" "}
                <Link href="/spending?filter=needs-classification" className="text-warning hover:underline">
                  {plan.unreviewed.count} {plan.unreviewed.count === 1 ? "transaction" : "transactions"} (
                  {whole(plan.unreviewed.total)}) need review
                </Link>{" "}
                and aren’t counted yet.
              </>
            ) : null}
            {plan.unlinkedBillPayments.count > 0 ? (
              <>
                {" "}
                <Link href="/spending" className="text-warning hover:underline">
                  {plan.unlinkedBillPayments.count} bill{" "}
                  {plan.unlinkedBillPayments.count === 1 ? "payment" : "payments"} (
                  {whole(plan.unlinkedBillPayments.total)})
                </Link>{" "}
                aren’t linked to a bill yet. They’re left out here because bills already count as fixed.
              </>
            ) : null}
          </p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-medium">Flexible spending by category</h2>
              <p className="num text-xs text-muted-foreground">{money(plan.flexSpent)} spent</p>
            </div>
            {plan.categories.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                No flexible spending yet this month.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {plan.categories.map((row) => (
                  <CategoryRow key={row.category} row={row} onCap={(cap) => setCap(row.category, cap)} />
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <label htmlFor="plan-savings" className="text-sm font-medium">
                Monthly savings target
              </label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Set aside before flexible spending. MoneyOS doesn’t move money. Transfer it yourself.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="num text-muted-foreground">$</span>
                <MoneyInput
                  id="plan-savings"
                  label="Monthly savings target"
                  value={settings.savingsTarget}
                  onCommit={(n) => update({ savingsTarget: n ?? 0 })}
                  className="w-32"
                />
                {sp.saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {sp.syncedToAccount ? "Saved to your account, so it syncs across devices." : "Saved in this browser. Sign in to sync it."}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-medium">Fixed each month</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>
                    <Link href="/bills" className="hover:text-primary">Bills</Link>
                  </dt>
                  <dd className="num">{money(plan.fixedBills)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>
                    <Link href="/subscriptions" className="hover:text-primary">Subscriptions you’re keeping</Link>
                  </dt>
                  <dd className="num">{money(plan.fixedSubscriptions)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Monthly equivalents of confirmed bills and approved subscriptions.
              </p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <AppShell
      title="Spending plan"
      description="Fixed costs and savings first. Everything else is one flexible budget."
    >
      {body}
    </AppShell>
  );
}
