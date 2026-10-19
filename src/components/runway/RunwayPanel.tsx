"use client";

import Link from "next/link";
import { AlertTriangle, CircleCheck, OctagonAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { RunwayChart } from "@/components/runway/RunwayChart";
import { RUNWAY_HORIZONS, useRunway, type RunwayHorizon } from "@/hooks/useRunway";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import type { RunwayResult, RunwayRiskLevel } from "@/lib/runway";
import { cn } from "@/lib/utils";

const money = (n: number) => formatCurrency(n, true);

function riskCopy(result: RunwayResult, risk: RunwayRiskLevel) {
  if (risk === "shortfall" && result.firstNegativeDate) {
    return {
      icon: OctagonAlert,
      tone: "text-destructive",
      text: `Projected to drop below $0 on ${formatDate(result.firstNegativeDate)}. Move or cut what you can before then.`,
    };
  }
  if (risk === "tight" && result.firstBelowBufferDate) {
    return {
      icon: AlertTriangle,
      tone: "text-warning",
      text: `Dips under your ${formatCurrency(result.buffer)} buffer on ${formatDate(result.firstBelowBufferDate)}.`,
    };
  }
  return {
    icon: CircleCheck,
    tone: "text-success",
    text:
      result.buffer > 0
        ? `Stays above your ${formatCurrency(result.buffer)} buffer for the next ${result.horizonDays} days.`
        : `Stays above $0 for the next ${result.horizonDays} days.`,
  };
}

export function HorizonPicker({
  value,
  onChange,
}: {
  value: RunwayHorizon;
  onChange: (h: RunwayHorizon) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Projection window" className="inline-flex rounded-[var(--radius-sm)] border border-border p-0.5">
      {RUNWAY_HORIZONS.map((h) => (
        <button
          key={h}
          type="button"
          role="radio"
          aria-checked={value === h}
          onClick={() => onChange(h)}
          className={cn(
            "num h-6 rounded-[3px] px-2 text-[11px] transition-colors",
            value === h ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {h}d
        </button>
      ))}
    </div>
  );
}

function Readout({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("num mt-1 truncate text-lg", tone)}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function ProjectedTag() {
  return (
    <span className="rounded-[3px] border border-primary/30 px-1.5 py-0.5 text-[11px] text-primary">
      Projected
    </span>
  );
}

function RunwayEmpty({ compact }: { compact?: boolean }) {
  return (
    <Card className={cn("p-5", compact ? "" : "p-8")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Runway</h2>
        <ProjectedTag />
      </div>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        Runway projects your cash day by day from your bills, subscriptions, and
        income. It needs a starting balance first.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/cash" className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 hover:border-primary/40">
          Add a cash account
        </Link>
        <Link href="/settings#live-bank-accounts" className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 hover:border-primary/40">
          Connect a bank
        </Link>
      </div>
    </Card>
  );
}

export function RunwayPanel({
  compact = false,
  runway,
}: {
  compact?: boolean;
  /** Pass a shared runway state so sibling views stay on the same window. */
  runway?: ReturnType<typeof useRunway>;
}) {
  const own = useRunway();
  const rw = runway ?? own;
  const { result, risk } = rw;

  if (rw.loading) {
    return <Card className={cn("animate-pulse", compact ? "h-[340px]" : "h-[520px]")} aria-label="Loading runway" />;
  }
  if (!rw.hasStartingBalance) return <RunwayEmpty compact={compact} />;

  const status = riskCopy(result, risk);
  const StatusIcon = status.icon;
  const counted = new Set(result.events.map((e) => `${e.kind}:${e.sourceId}`)).size;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">Runway</h2>
          <ProjectedTag />
        </div>
        <div className="flex items-center gap-3">
          <HorizonPicker value={rw.horizon} onChange={rw.setHorizon} />
          {compact ? (
            <Link href="/runway" className="text-xs text-primary hover:underline">
              Open runway
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 px-5 pt-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div>
          <p className="text-xs text-muted-foreground">Safe to spend today</p>
          <AnimatedNumber
            value={result.safeToSpendToday}
            format={money}
            className={cn(
              "mt-1 block text-4xl font-medium tracking-tight sm:text-5xl",
              result.safeToSpendToday <= 0 && "text-destructive",
            )}
          />
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            What you could spend now and still keep every projected day through{" "}
            {formatDate(result.endDate)} at or above{" "}
            {result.buffer > 0 ? `your ${formatCurrency(result.buffer)} buffer` : "$0"}.
          </p>
          <p className={cn("mt-4 flex items-start gap-2 text-sm", status.tone)}>
            <StatusIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{status.text}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 self-start sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Readout
            label="Cash today"
            value={money(result.startingBalance)}
            detail={rw.startingBalanceLabel}
          />
          <Readout
            label="Lowest point"
            value={money(result.lowest.balance)}
            detail={formatDate(result.lowest.date)}
            tone={result.lowest.balance < 0 ? "text-destructive" : result.lowest.balance < result.buffer ? "text-warning" : undefined}
          />
          <Readout
            label="Next income"
            value={result.nextIncome ? `+${money(result.nextIncome.amount)}` : "None"}
            detail={result.nextIncome ? `${formatDate(result.nextIncome.date)}, ${result.nextIncome.label}` : `In the next ${result.horizonDays} days`}
            tone={result.nextIncome ? "text-success" : "text-muted-foreground"}
          />
          <Readout
            label={`On ${formatDate(result.endDate)}`}
            value={money(result.endingBalance)}
            detail={`${result.endingBalance >= result.startingBalance ? "+" : "−"}${money(Math.abs(result.endingBalance - result.startingBalance))} net`}
          />
        </div>
      </div>

      <div className="px-2 pb-3 pt-4 sm:px-3">
        <RunwayChart result={result} compact={compact} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
        <span>
          Projected from {counted} {counted === 1 ? "item" : "items"} you’ve confirmed, starting at your{" "}
          {rw.startingBalanceLabel} cash balance.
        </span>
        {result.exclusions.length > 0 ? (
          <Link href="/runway#not-included" className="hover:text-foreground">
            {result.exclusions.length} not included
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
