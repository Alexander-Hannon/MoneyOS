import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance";
import type { MoneyAlert } from "@/lib/types";

const accentBySeverity: Record<MoneyAlert["severity"], string> = {
  critical: "from-destructive/20 ring-destructive/30",
  warning: "from-warning/20 ring-warning/25",
  info: "from-primary/20 ring-primary/25",
};

export function NextActionCard({ action }: { action: MoneyAlert }) {
  const isClear = action.kind === "all-clear";

  return (
    <section
      className={`relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br ${accentBySeverity[action.severity]} to-card p-6 ring-1`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {isClear ? (
          <ShieldCheck className="size-4 text-primary" />
        ) : (
          <Sparkles className="size-4 text-primary" />
        )}
        Next responsible action
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {action.title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            {action.description}
          </p>
        </div>
        {!isClear && (
          <Button size="lg" className="shrink-0">
            {action.action}
            {action.amount ? ` · ${formatCurrency(action.amount)}` : ""}
            <ArrowRight />
          </Button>
        )}
      </div>
    </section>
  );
}
