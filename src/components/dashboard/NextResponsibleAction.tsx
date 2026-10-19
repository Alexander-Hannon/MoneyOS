"use client";

import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toneForAlertSeverity } from "@/lib/money-utils";
import { useActionNavigation } from "@/hooks/useActionNavigation";
import type { Alert } from "@/types/money";

const severityRail: Record<Alert["severity"], string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-primary",
};

export function NextResponsibleAction({ action }: { action: Alert | null }) {
  const { navigateToAlert } = useActionNavigation();

  if (!action) {
    return (
      <section className="rounded-[var(--radius)] border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-6 pl-7">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${severityRail[action.severity]}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
        <Button
          size="lg"
          className="shrink-0 self-start lg:self-auto"
          onClick={() => navigateToAlert(action)}
        >
          Take action
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
