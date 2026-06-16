"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Target,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { scrollToSection } from "@/lib/scroll-nav";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useMoneyData } from "@/lib/storage/store";
import { generateFirstThreeActions } from "@/lib/action-priority";
import type { ActionItem } from "@/types/actions";
import type { Tone } from "@/types/money";

const typeTone: Record<ActionItem["type"], Tone> = {
  pay_bill: "warning",
  trial_ending: "danger",
  subscription_review: "warning",
  classify_transaction: "info",
  recurring_suggestion: "info",
  spending_later: "neutral",
  setup: "neutral",
  ai_recommendation: "info",
  review_alert: "warning",
};

function handleAction(item: ActionItem) {
  if (item.href) {
    window.open(item.href, "_blank", "noopener,noreferrer");
    return;
  }
  switch (item.type) {
    case "pay_bill":
    case "review_alert":
      scrollToSection("bills");
      break;
    case "trial_ending":
    case "subscription_review":
      scrollToSection("subscriptions");
      break;
    case "classify_transaction":
    case "recurring_suggestion":
      scrollToSection("recurring-detected");
      break;
    case "spending_later":
      scrollToSection("spending-later");
      break;
    case "setup":
      scrollToSection("accounts");
      break;
    default:
      scrollToSection("alerts");
  }
}

export function ActionCenter() {
  const fd = useFinancialData();
  const { actionItems } = fd;
  const { dismissActionItem } = useMoneyData();

  const firstThree = useMemo(() => generateFirstThreeActions(fd), [fd]);
  const visible = actionItems.slice(0, 12);
  const highPriority = visible.filter((a) => a.priority === "high").length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={ListChecks}
          title="Action Center"
          description="One place for bills, trials, reviews, and setup tasks"
          meta={`${visible.length} open · ${highPriority} high priority`}
        />

        <div className="mb-4 rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Target className="size-3.5" />
            First 3 actions
          </p>
          <ol className="space-y-2">
            {firstThree.map((action, i) => (
              <li
                key={action.id}
                className="rounded-[var(--radius-md)] border border-border/60 bg-card px-3 py-2 text-sm"
              >
                <span className="mr-2 font-semibold text-primary">{i + 1}.</span>
                {action.title}
              </li>
            ))}
          </ol>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-6 text-center">
            <CheckCircle2 className="mx-auto size-8 text-success" />
            <p className="mt-2 text-sm font-medium">Nothing urgent right now</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New actions appear when bills, trials, or reviews need attention.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <StatusBadge
                      label={item.priority}
                      tone={typeTone[item.type]}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.source}
                    {item.dueDate ? ` · due ${item.dueDate}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAction(item)}
                    className="gap-1.5"
                  >
                    {item.href ? (
                      <ExternalLink className="size-3.5" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                    {item.actionLabel}
                  </Button>
                  {item.dismissible && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Dismiss ${item.title}`}
                      onClick={() => dismissActionItem(item.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

      </CardContent>
    </Card>
  );
}
