"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { MoneyFlowDiagram } from "@/components/flow/MoneyFlowDiagram";
import { useFinancialData } from "@/hooks/useFinancialData";
import { availableFlowMonths, buildMoneyFlow, type FlowNode } from "@/lib/money-flow";
import { formatCurrency } from "@/lib/money-utils";
import type { DataSource } from "@/types/transactions";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<DataSource, string> = {
  plaid_live: "Personal Live",
  plaid_sandbox: "Plaid Sandbox",
  mock: "Demo Data",
  manual: "Your Data",
};

const money = (n: number) => formatCurrency(n, true);

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function FlowTable({ title, nodes }: { title: string; nodes: FlowNode[] }) {
  return (
    <div>
      <h3 className="px-5 pb-1 pt-3 text-xs text-muted-foreground">{title}</h3>
      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.id} className="border-b border-border/60 last:border-0">
              <td className="px-5 py-2">{n.label}</td>
              <td className="px-2 py-2 text-right text-xs text-muted-foreground">
                {n.count > 0 ? `${n.count} txn${n.count === 1 ? "" : "s"}` : ""}
              </td>
              <td className="num px-5 py-2 text-right">{money(n.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MoneyFlowPageClient() {
  const fd = useFinancialData();
  const months = useMemo(() => availableFlowMonths(fd.transactions), [fd.transactions]);
  const [picked, setPicked] = useState<string | null>(null);
  const month = picked && months.includes(picked) ? picked : months[0] ?? null;
  const idx = month ? months.indexOf(month) : -1;

  const flow = useMemo(
    () => (month ? buildMoneyFlow(fd.transactions, month) : null),
    [fd.transactions, month],
  );
  const sourceLabel = SOURCE_LABEL[fd.dataSource] ?? fd.dataSourceBadge;

  let body: React.ReactNode;
  if (fd.loading) {
    body = <Card className="h-[480px] animate-pulse" aria-label="Loading money flow" />;
  } else if (!flow) {
    body = (
      <Card className="p-8">
        <h2 className="text-sm font-medium">No transactions yet</h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Money flow is drawn from real transactions. Connect a bank to see where
          each month’s money came from and where it went.
        </p>
        <Link href="/settings#live-bank-accounts" className="mt-4 inline-block text-sm text-primary hover:underline">
          Connect a bank
        </Link>
      </Card>
    );
  } else {
    const savingsRate = flow.totalIn > 0 ? Math.round((flow.net / flow.totalIn) * 100) : null;
    body = (
      <>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium">{monthLabel(flow.month)}</h2>
              <span className="rounded-[3px] border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {sourceLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                disabled={idx >= months.length - 1}
                onClick={() => setPicked(months[idx + 1])}
                className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={idx <= 0}
                onClick={() => setPicked(months[idx - 1])}
                className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-5 pt-5 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Money in</p>
              <p className="num mt-1 text-lg text-success">{money(flow.totalIn)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Money out</p>
              <p className="num mt-1 text-lg">{money(flow.totalOut)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{flow.net >= 0 ? "Kept" : "Overspent"}</p>
              <p className={cn("num mt-1 text-lg", flow.net < 0 && "text-destructive")}>
                {money(Math.abs(flow.net))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {flow.net >= 0 ? "Kept of money in" : "Spent vs. money in"}
              </p>
              <p className="num mt-1 text-lg">
                {flow.totalIn === 0
                  ? "—"
                  : flow.net >= 0
                    ? `${savingsRate}%`
                    : `${Math.round((flow.totalOut / flow.totalIn) * 100)}%`}
              </p>
            </div>
          </div>

          <div className="px-3 pb-4 pt-5 sm:px-5">
            {flow.totalIn === 0 && flow.totalOut === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No income or spending this month, only movement between your accounts.
              </p>
            ) : (
              <MoneyFlowDiagram flow={flow} />
            )}
          </div>

          <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
            {flow.movedBetweenAccounts > 0
              ? `${money(flow.movedBetweenAccounts)} moved between your own accounts (transfers, card and loan payments) and isn’t counted as income or spending. `
              : ""}
            {flow.month === months[0] ? "This month is still in progress." : ""}
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">Details</h2>
          </div>
          <div className="grid divide-border lg:grid-cols-2 lg:divide-x">
            <FlowTable title="Came from" nodes={flow.sources} />
            <FlowTable title="Went to" nodes={flow.uses} />
          </div>
        </Card>
      </>
    );
  }

  return (
    <AppShell title="Money flow" description="Where each month’s money came from and where it went.">
      {body}
    </AppShell>
  );
}
