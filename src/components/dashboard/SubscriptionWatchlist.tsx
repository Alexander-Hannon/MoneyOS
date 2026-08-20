"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Repeat } from "lucide-react";
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
  formatRelativeDays,
  frequencyLabel,
  toneForSubscriptionStatus,
} from "@/lib/money-utils";
import {
  approvedSubscriptionsMonthlyTotal,
} from "@/lib/recurring-obligations";
import {
  partitionSubscriptions,
  phaseTone,
  type SubscriptionOccurrenceView,
} from "@/lib/obligations-lifecycle";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { Subscription } from "@/types/money";

function SubscriptionItem({
  view,
  onEdit,
  onDelete,
  onMarkRenewed,
  showActions,
}: {
  view: SubscriptionOccurrenceView;
  onEdit: () => void;
  onDelete: () => void;
  onMarkRenewed: () => void;
  showActions: boolean;
}) {
  const { subscription: sub, occurrenceDate, phase, displayLabel, daysUntil } =
    view;

  return (
    <li className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-colors hover:border-foreground/15">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{sub.name}</p>
          <StatusBadge
            label={displayLabel}
            tone={phaseTone(phase)}
          />
          {sub.status !== "keep" && (
            <StatusBadge
              label={sub.status}
              tone={toneForSubscriptionStatus(sub.status)}
            />
          )}
          {sub.isTrial && <StatusBadge label="Trial" tone="warning" />}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {sub.category} · {frequencyLabel(sub.frequency)}
          {` · ${formatDate(occurrenceDate)} (${formatRelativeDays(daysUntil)})`}
          {sub.isTrial && sub.trialEndDate
            ? ` · trial ends ${formatDate(sub.trialEndDate)}`
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
              window.open(sub.cancellationUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="size-3.5" />
            Cancel/manage
          </Button>
        )}
        {showActions && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={onMarkRenewed}
          >
            Mark renewed
          </Button>
        )}
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(sub.amount, true)}
        </span>
        <RowActions label={sub.name} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}

export function SubscriptionWatchlist({
  statusFilter = null,
}: {
  statusFilter?: "review" | "trial" | null;
}) {
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    markSubscriptionRenewed,
  } = useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);

  const monthlyTotal = approvedSubscriptionsMonthlyTotal(subscriptions);
  const flagged = subscriptions.filter((s) => s.status === "review").length;

  const { active, completed } = useMemo(
    () => partitionSubscriptions(subscriptions),
    [subscriptions],
  );

  const filterSub = (sub: Subscription) => {
    if (statusFilter === "review") return sub.status === "review";
    if (statusFilter === "trial") return Boolean(sub.isTrial);
    return true;
  };

  const visibleActive = active.filter((view) => filterSub(view.subscription));
  const visibleCompleted = completed.filter((view) =>
    filterSub(view.subscription),
  );
  const inactiveSubs = subscriptions.filter(
    (sub) => sub.status !== "keep" && filterSub(sub),
  );

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Repeat}
          title="Subscription Watchlist"
          description="Renewals roll forward from your recurrence schedule"
          meta={`${formatCurrency(monthlyTotal, true)}/mo confirmed · ${flagged} review`}
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
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Active / Upcoming ({visibleActive.length})
              </h3>
              {visibleActive.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active renewals in this view.
                </p>
              ) : (
                <ul className="space-y-2">
                  {visibleActive.map((view) => (
                    <SubscriptionItem
                      key={`${view.subscription.id}-${view.occurrenceDate}-active`}
                      view={view}
                      showActions
                      onMarkRenewed={() => {
                        markSubscriptionRenewed(view.subscription.id);
                        toast("Subscription marked renewed for this cycle");
                      }}
                      onEdit={() => {
                        setEditing(view.subscription);
                        setOpen(true);
                      }}
                      onDelete={() => {
                        deleteSubscription(view.subscription.id);
                        toast("Subscription deleted");
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>

            {visibleCompleted.length > 0 && (
              <div>
                <button
                  type="button"
                  className="mb-2 flex items-center gap-1 text-sm font-medium"
                  onClick={() => setCompletedOpen((v) => !v)}
                >
                  {completedOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  Renewed This Cycle ({visibleCompleted.length})
                </button>
                {completedOpen && (
                  <ul className="space-y-2">
                    {visibleCompleted.map((view) => (
                      <SubscriptionItem
                        key={`${view.subscription.id}-${view.occurrenceDate}-done`}
                        view={view}
                        showActions={false}
                        onMarkRenewed={() => {}}
                        onEdit={() => {
                          setEditing(view.subscription);
                          setOpen(true);
                        }}
                        onDelete={() => {
                          deleteSubscription(view.subscription.id);
                          toast("Subscription deleted");
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}

            {inactiveSubs.length > 0 && !statusFilter && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Review / Canceled ({inactiveSubs.length})
                </h3>
                <ul className="space-y-2">
                  {inactiveSubs.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border/40 px-3.5 py-2.5 opacity-80"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{sub.name}</p>
                          <StatusBadge
                            label={sub.status}
                            tone={toneForSubscriptionStatus(sub.status)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {sub.category} · {frequencyLabel(sub.frequency)}
                        </p>
                      </div>
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
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
