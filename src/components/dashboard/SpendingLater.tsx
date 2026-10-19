"use client";

import { useState } from "react";
import { PiggyBank, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { SpendingLaterForm } from "@/components/forms/SpendingLaterForm";
import { formatCurrency, formatDate, daysUntil } from "@/lib/money-utils";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { PlannedExpense, PlannedExpensePriority, Tone } from "@/types/money";

const statusTone: Record<PlannedExpense["status"], Tone> = {
  saving: "info",
  planned: "neutral",
  scheduled: "success",
  funded: "success",
  completed: "neutral",
  paused: "warning",
};

const priorityTone: Record<PlannedExpensePriority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "danger",
};

export function SpendingLater() {
  const {
    spendingLater: items,
    addSpendingLater,
    updateSpendingLater,
    deleteSpendingLater,
  } = useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlannedExpense | null>(null);

  const known = items
    .filter((i) => i.amount != null && i.status !== "completed")
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const upcoming = items
    .filter((i) => i.status !== "completed" && i.status !== "paused")
    .filter((i) => {
      const date = i.targetDate ?? i.reminderDate;
      if (!date) return false;
      const days = daysUntil(date);
      return days >= 0 && days <= 30;
    })
    .slice(0, 3);

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={PiggyBank}
          title="Spending Later"
          description="Future obligations and money to set aside"
          meta={`${formatCurrency(known)} planned · ${upcoming.length} upcoming`}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Add item
            </Button>
          }
        />
        {items.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No planned spending yet."
            description="Add future obligations or savings goals when you're ready."
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-foreground/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.title ?? item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.category}
                      {item.targetDate
                        ? ` · by ${formatDate(item.targetDate)}`
                        : ""}
                      {item.fundingSource
                        ? ` · from ${item.fundingSource}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium num">
                      {item.amount == null
                        ? "TBD"
                        : formatCurrency(item.amount)}
                    </span>
                    <RowActions
                      label={item.title ?? item.name}
                      onEdit={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                      onDelete={() => {
                        deleteSpendingLater(item.id);
                        toast("Spending Later item deleted");
                      }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={item.status}
                    tone={statusTone[item.status]}
                  />
                  {item.priority && (
                    <StatusBadge
                      label={`${item.priority} priority`}
                      tone={priorityTone[item.priority]}
                    />
                  )}
                  {item.notes && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Spending Later item" : "Add Spending Later item"}
        description="Stored locally in your browser."
      >
        <SpendingLaterForm
          initial={editing ?? undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(draft) => {
            if (editing) {
              updateSpendingLater(editing.id, draft);
              toast("Item updated");
            } else {
              addSpendingLater(draft);
              toast("Item added");
            }
            setOpen(false);
          }}
        />
      </Dialog>
    </Card>
  );
}
