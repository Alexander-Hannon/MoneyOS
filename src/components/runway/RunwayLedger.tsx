"use client";

import { CalendarClock, PiggyBank, Repeat, TrendingUp, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import type { RunwayEventKind, RunwayResult } from "@/lib/runway";
import { cn } from "@/lib/utils";

const KIND_META: Record<RunwayEventKind, { label: string; icon: LucideIcon }> = {
  bill: { label: "Bill", icon: CalendarClock },
  subscription: { label: "Subscription", icon: Repeat },
  income: { label: "Income", icon: TrendingUp },
  planned: { label: "Planned", icon: PiggyBank },
};

function weekday(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

/** Day-by-day schedule with the projected balance after each active day. */
export function RunwayLedger({ result }: { result: RunwayResult }) {
  const activeDays = result.days.filter((d) => d.events.length > 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium">Schedule</h2>
        <p className="text-xs text-muted-foreground">
          <span className="num text-success">+{formatCurrency(result.totals.inflow, true)}</span>
          {" in, "}
          <span className="num text-destructive">−{formatCurrency(result.totals.outflow, true)}</span>
          {" out"}
        </p>
      </div>
      {activeDays.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">
          Nothing is scheduled in this window. Add bills, subscriptions, or income
          to see how they move your balance.
        </p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Projected schedule</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="w-28 px-5 py-2 font-normal">Date</th>
              <th scope="col" className="px-2 py-2 font-normal">Item</th>
              <th scope="col" className="px-2 py-2 text-right font-normal">Amount</th>
              <th scope="col" className="hidden px-5 py-2 text-right font-normal sm:table-cell">Balance after</th>
            </tr>
          </thead>
          <tbody>
            {activeDays.map((day) =>
              day.events.map((e, i) => {
                const meta = KIND_META[e.kind];
                const Icon = meta.icon;
                const last = i === day.events.length - 1;
                return (
                  <tr
                    key={e.id}
                    className={cn(last && "border-b border-border/60", "align-top")}
                  >
                    <td className="px-5 py-2">
                      {i === 0 ? (
                        <span className="num whitespace-nowrap text-xs">
                          <span className="text-muted-foreground">{weekday(day.date)} </span>
                          {formatDate(day.date)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-label={meta.label} />
                        <span className="truncate">{e.label}</span>
                        {e.overdue ? (
                          <span className="shrink-0 rounded-[3px] bg-destructive/15 px-1.5 text-[11px] text-destructive">
                            Overdue since {formatDate(e.occurrenceDate)}
                          </span>
                        ) : null}
                        {e.kind === "income" && e.reliability && e.reliability !== "high" ? (
                          <span className="shrink-0 rounded-[3px] bg-warning/10 px-1.5 text-[11px] text-warning">
                            {e.reliability} reliability
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className={cn("num px-2 py-2 text-right", e.amount >= 0 ? "text-success" : "text-foreground")}>
                      {e.amount >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(e.amount), true)}
                    </td>
                    <td
                      className={cn(
                        "num hidden px-5 py-2 text-right sm:table-cell",
                        day.balance < 0 ? "text-destructive" : day.balance < result.buffer ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {last ? formatCurrency(day.balance, true) : ""}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
}
