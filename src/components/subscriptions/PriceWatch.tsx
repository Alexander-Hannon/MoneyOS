"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMoneyData } from "@/lib/storage/store";
import {
  annualSubscriptionCost,
  chargesForSubscription,
  detectPriceChanges,
  type PriceChange,
} from "@/lib/price-changes";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import { cn } from "@/lib/utils";

const money = (n: number) => formatCurrency(n, true);

const KIND_META = {
  increase: { icon: TrendingUp, tone: "text-destructive", verb: "Price went up" },
  decrease: { icon: TrendingDown, tone: "text-success", verb: "Price went down" },
  mismatch: { icon: Scale, tone: "text-warning", verb: "Charged differently than recorded" },
} as const;

export function PriceWatch() {
  const fd = useFinancialData();
  const { subscriptions, updateSubscription } = useMoneyData();
  const toast = useToast();
  const [confirming, setConfirming] = useState<PriceChange | null>(null);

  const changes = useMemo(
    () => detectPriceChanges(fd.subscriptions, fd.transactions),
    [fd.subscriptions, fd.transactions],
  );
  const checkedCount = useMemo(
    () =>
      fd.subscriptions.filter(
        (s) => s.status !== "cancel" && chargesForSubscription(s, fd.transactions).charges.length > 0,
      ).length,
    [fd.subscriptions, fd.transactions],
  );
  const annual = annualSubscriptionCost(fd.subscriptions);
  const yearlyIncrease = changes
    .filter((c) => c.kind === "increase")
    .reduce((s, c) => s + c.annualImpact, 0);

  const target = confirming ? subscriptions.find((s) => s.id === confirming.subscriptionId) : null;

  const applyAmount = () => {
    if (!confirming || !target) return;
    const { id, ...draft } = target;
    updateSubscription(id, { ...draft, amount: confirming.to });
    toast(`${target.name} amount updated to ${money(confirming.to)}`);
    setConfirming(null);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium">Price watch</h2>
        <p className="text-xs text-muted-foreground">
          Keeping costs <span className="num text-foreground">{money(annual)}</span> a year
          {yearlyIncrease > 0 ? (
            <>
              , <span className="num text-destructive">+{money(yearlyIncrease)}</span> from recent increases
            </>
          ) : null}
        </p>
      </div>

      {fd.transactions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Connect a bank and MoneyOS will compare each subscription’s charges to spot price changes.
        </p>
      ) : changes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          {checkedCount === 0
            ? "No charges match your subscriptions yet. Link a charge to its subscription in Spending to start watching its price."
            : `No price changes across the ${checkedCount} ${checkedCount === 1 ? "subscription" : "subscriptions"} with matching charges.`}
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {changes.map((c) => {
            const meta = KIND_META[c.kind];
            const Icon = meta.icon;
            return (
              <li key={`${c.subscriptionId}:${c.kind}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <Icon className={cn("size-4 shrink-0", meta.tone)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {c.name}
                    <span className="text-muted-foreground">: {meta.verb.toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="num">{money(c.from)}</span>
                    {c.kind === "mismatch" ? " recorded, " : ` on ${formatDate(c.previousDate!)}, `}
                    <span className="num text-foreground">{money(c.to)}</span> charged {formatDate(c.date)}
                    {c.matchedBy === "merchant" ? ". Matched by merchant name" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("num text-sm", c.delta > 0 ? "text-destructive" : "text-success")}>
                    {c.delta > 0 ? "+" : "−"}
                    {Math.abs(c.pct).toFixed(0)}%
                  </p>
                  <p className="num text-xs text-muted-foreground">
                    {c.annualImpact > 0 ? "+" : "−"}
                    {money(Math.abs(c.annualImpact))}/yr
                  </p>
                </div>
                {subscriptions.some((s) => s.id === c.subscriptionId && s.amount !== c.to) ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirming(c)}>
                    Use {money(c.to)}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={confirming != null && target != null}
        onClose={() => setConfirming(null)}
        title={`Update ${target?.name ?? "subscription"} amount?`}
        description="Changes the recorded amount only. Nothing is paid or cancelled."
      >
        {confirming && target ? (
          <div className="space-y-4 text-sm">
            <p>
              The recorded amount changes from <span className="num">{money(target.amount)}</span> to{" "}
              <span className="num">{money(confirming.to)}</span>, the latest charge on {formatDate(confirming.date)}.
              Your runway, spending plan, and monthly totals will use the new amount, and the change syncs to your other devices.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(null)}>
                Keep {money(target.amount)}
              </Button>
              <Button onClick={applyAmount}>Use {money(confirming.to)}</Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </Card>
  );
}
