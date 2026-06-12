import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toneForAlertSeverity } from "@/lib/money-utils";
import type { Alert } from "@/types/money";

const severityRing: Record<Alert["severity"], string> = {
  high: "from-destructive/20 ring-destructive/30",
  medium: "from-warning/20 ring-warning/25",
  low: "from-primary/20 ring-primary/25",
};

export function NextResponsibleAction({ action }: { action: Alert | null }) {
  if (!action) {
    return (
      <section className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Next responsible action
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          You&apos;re all caught up
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing needs a decision right now. Keep the system disciplined.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br ${severityRing[action.severity]} to-card p-6 ring-1`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          Next responsible action
        </span>
        <StatusBadge
          label={`${action.severity} priority`}
          tone={toneForAlertSeverity(action.severity)}
        />
        {action.reviewRequired && (
          <StatusBadge label="Review required" tone="warning" />
        )}
        <StatusBadge label={action.category} tone="neutral" />
      </div>

      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {action.suggestedAction}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {action.title} — {action.description}
          </p>
        </div>
        <Button size="lg" className="shrink-0 self-start lg:self-auto">
          Take action
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
