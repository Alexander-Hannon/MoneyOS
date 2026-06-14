"use client";

import { useState } from "react";
import { ExternalLink, Plus, Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  frequencyLabel,
  monthlySubscriptionTotal,
  toneForSubscriptionStatus,
} from "@/lib/money-utils";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { Subscription } from "@/types/money";

export function SubscriptionWatchlist() {
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const monthlyTotal = monthlySubscriptionTotal(subscriptions);
  const flagged = subscriptions.filter((s) => s.status === "review").length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Repeat}
          title="Subscription Watchlist"
          description="Recurring software and services"
          meta={`${formatCurrency(monthlyTotal, true)}/mo · ${flagged} review`}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Add
            </Button>
          }
        />

        {subscriptions.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No subscriptions added yet."
            description="Add recurring services to keep an eye on them."
          />
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-colors hover:border-foreground/15"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{sub.name}</p>
                    <StatusBadge
                      label={sub.status}
                      tone={toneForSubscriptionStatus(sub.status)}
                    />
                    {sub.isTrial && (
                      <StatusBadge label="Trial" tone="warning" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {sub.category} · {frequencyLabel(sub.frequency)}
                    {sub.isTrial && sub.trialEndDate
                      ? ` · trial ends ${formatDate(sub.trialEndDate)} (${daysUntil(sub.trialEndDate)}d)`
                      : sub.renewalDate
                        ? ` · renews ${formatDate(sub.renewalDate)}`
                        : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {sub.cancellationUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        window.open(
                          sub.cancellationUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="size-3.5" />
                      Cancel/manage
                    </Button>
                  )}
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(sub.amount, true)}
                  </span>
                  <RowActions
                    label={sub.name}
                    onEdit={() => {
                      setEditing(sub);
                      setOpen(true);
                    }}
                    onDelete={() => {
                      deleteSubscription(sub.id);
                      toast("Subscription deleted");
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit subscription" : "Add subscription"}
        description="Stored locally in your browser."
      >
        <SubscriptionForm
          initial={editing ?? undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(draft) => {
            if (editing) {
              updateSubscription(editing.id, draft);
              toast("Subscription updated");
            } else {
              addSubscription(draft);
              toast("Subscription added");
            }
            setOpen(false);
          }}
        />
      </Dialog>
    </Card>
  );
}
