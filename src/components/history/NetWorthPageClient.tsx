"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { NetWorthChart } from "@/components/history/NetWorthChart";
import { useBalanceHistory } from "@/hooks/useBalanceHistory";
import { historyChange, isLiabilityType } from "@/lib/balance-history";
import { addDaysYMD, toYMD } from "@/lib/recurrence";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import { cn } from "@/lib/utils";

const RANGES = [
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "365", label: "1y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];
type Metric = "netWorth" | "cash";

const money = (n: number) => formatCurrency(n, true);

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ key: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[var(--radius-sm)] border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "h-6 rounded-[3px] px-2 text-[11px] transition-colors",
            value === o.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-8">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-2 max-w-prose text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}

export function NetWorthPageClient() {
  const bh = useBalanceHistory();
  const [range, setRange] = useState<RangeKey>("90");
  const [metric, setMetric] = useState<Metric>("netWorth");

  const points = useMemo(() => {
    const r = RANGES.find((x) => x.key === range)!;
    if (r.days == null) return bh.history.points;
    const since = addDaysYMD(toYMD(new Date()), -r.days);
    return bh.history.points.filter((p) => p.date >= since);
  }, [bh.history.points, range]);

  const latest = bh.history.points[bh.history.points.length - 1];
  const change = historyChange(points, metric);
  const accountsById = new Map(bh.history.accounts.map((a) => [a.id, a]));

  let body: React.ReactNode;
  if (bh.state === "signed_out") {
    body = (
      <Notice title="Sign in to see your history">
        Balance history is stored with your account so it can build up over time
        across devices.
      </Notice>
    );
  } else if (bh.state === "no_database") {
    body = (
      <Notice title="History needs the database">
        Balance history is saved server-side. Configure the database to start recording.
      </Notice>
    );
  } else if (bh.state === "no_bank") {
    body = (
      <Notice title="Connect a bank to start recording">
        MoneyOS records a balance for each linked account whenever balances are
        refreshed. Manual accounts aren’t tracked yet.{" "}
        <Link href="/settings#live-bank-accounts" className="text-primary hover:underline">
          Connect a bank
        </Link>
      </Notice>
    );
  } else if (bh.state === "error") {
    body = (
      <Notice title="History didn’t load">
        <p>{bh.error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void bh.reload()}>
          Try again
        </Button>
      </Notice>
    );
  } else if (bh.state === "loading") {
    body = <Card className="h-[460px] animate-pulse" aria-label="Loading history" />;
  } else if (!latest) {
    body = (
      <Notice title="No balances recorded yet">
        Recording starts the next time your {bh.sourceLabel} balances are
        refreshed. History begins from that day; nothing earlier is estimated.
      </Notice>
    );
  } else {
    body = (
      <>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium">{metric === "cash" ? "Cash" : "Net worth"}</h2>
              <span className="rounded-[3px] border border-warning/30 px-1.5 py-0.5 text-[11px] text-warning">
                {bh.sourceLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Measure"
                value={metric}
                onChange={setMetric}
                options={[
                  { key: "netWorth", label: "Net worth" },
                  { key: "cash", label: "Cash" },
                ]}
              />
              <Segmented label="Range" value={range} onChange={setRange} options={RANGES} />
            </div>
          </div>

          <div className="grid gap-6 px-5 pt-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            <div>
              <p className="text-xs text-muted-foreground">
                As of {formatDate(latest.date)}
              </p>
              <AnimatedNumber
                value={latest[metric]}
                format={money}
                className="mt-1 block text-4xl font-medium tracking-tight sm:text-5xl"
              />
              {change ? (
                <p className={cn("num mt-2 text-sm", change.delta >= 0 ? "text-success" : "text-destructive")}>
                  {change.delta >= 0 ? "+" : "−"}
                  {money(Math.abs(change.delta))}
                  <span className="text-muted-foreground"> since {formatDate(points[0].date)}</span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Change appears once there are two readings in this range.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 self-start">
              <div>
                <p className="text-xs text-muted-foreground">Assets</p>
                <p className="num mt-1 text-lg">{money(latest.assets)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Debts</p>
                <p className="num mt-1 text-lg">{money(latest.liabilities)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Readings</p>
                <p className="num mt-1 text-lg">{points.length}</p>
              </div>
            </div>
          </div>

          <div className="px-2 pb-3 pt-4 sm:px-3">
            {points.length > 0 ? (
              <NetWorthChart points={points} metric={metric} accounts={bh.history.accounts} />
            ) : (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                No readings in this range. Choose a longer range.
              </p>
            )}
          </div>

          <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            Recorded since {formatDate(bh.history.firstDate!)}. Each dot is a real
            reading taken when balances were refreshed; the line holds a balance
            until the next one. Nothing before the first reading is estimated.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">Accounts</h2>
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Latest recorded balance per account</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2 font-normal">Account</th>
                <th scope="col" className="hidden px-2 py-2 font-normal sm:table-cell">Type</th>
                <th scope="col" className="px-2 py-2 text-right font-normal">Balance</th>
                <th scope="col" className="px-5 py-2 text-right font-normal">Read</th>
              </tr>
            </thead>
            <tbody>
              {bh.history.latestByAccount.map((row) => {
                const a = accountsById.get(row.accountId);
                const debt = isLiabilityType(row.accountType);
                return (
                  <tr key={row.accountId} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="truncate">{a?.name ?? "Account"}</p>
                      <p className="text-xs text-muted-foreground">
                        {a?.institution}
                        {a?.mask ? ` ••${a.mask}` : ""}
                      </p>
                    </td>
                    <td className="hidden px-2 py-2.5 capitalize text-muted-foreground sm:table-cell">
                      {row.accountType}
                    </td>
                    <td className={cn("num px-2 py-2.5 text-right", debt && "text-destructive")}>
                      {debt ? "−" : ""}
                      {money(Math.abs(row.value))}
                    </td>
                    <td className="num px-5 py-2.5 text-right text-xs text-muted-foreground">
                      {formatDate(row.date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </>
    );
  }

  return (
    <AppShell
      title="Net worth"
      description="Your balances over time, built only from readings MoneyOS has actually recorded."
    >
      {body}
    </AppShell>
  );
}
