"use client";

import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { IncomeForm } from "@/components/forms/IncomeForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDate,
  formatRelativeDays,
  frequencyLabel,
  toneForReliability,
} from "@/lib/money-utils";
import { daysUntil } from "@/lib/money-utils";
import { getIncomeNextDate } from "@/lib/recurrence";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { IncomeSource } from "@/types/money";

function expectedLabel(src: IncomeSource): string {
  const base =
    src.expectedAmount === null ? "Variable" : formatCurrency(src.expectedAmount);
  return src.amountType === "commission" ? `${base} + commission` : base;
}

export function IncomePipeline({
  reviewOnly = false,
}: {
  reviewOnly?: boolean;
}) {
  const { income, addIncome, updateIncome, deleteIncome, toggleIncomeActive, markIncomeReceived } =
    useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);

  const activeCount = income.filter((i) => i.active).length;
  const visibleIncome = income.filter((row) => {
    if (!reviewOnly) return true;
    return !row.active || row.reliability === "low" || row.expectedAmount === null;
  });

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={TrendingUp}
          title="Income Pipeline"
          description="Where money comes from and how reliable it is"
          meta={`${activeCount} active`}
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

        {visibleIncome.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title={
              reviewOnly
                ? "No income sources need review."
                : "No income sources added yet."
            }
            description="Add the places your money comes from."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Source</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next pay</TableHead>
                <TableHead>Reliability</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleIncome.map((src) => {
                const nextPay = src.active ? getIncomeNextDate(src) : undefined;
                const days = nextPay ? daysUntil(nextPay) : null;
                return (
                <TableRow key={src.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {src.source}
                    {src.startDate && !src.active && (
                      <div className="text-xs text-muted-foreground">
                        starts {formatDate(src.startDate)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {expectedLabel(src)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {frequencyLabel(src.frequency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {nextPay ? (
                      <>
                        <div className="text-sm">{formatDate(nextPay)}</div>
                        <div className="text-xs text-muted-foreground">
                          {days != null ? formatRelativeDays(days) : ""}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={src.reliability}
                      tone={toneForReliability(src.reliability)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleIncomeActive(src.id)}
                      aria-label={`Toggle active for ${src.source}`}
                    >
                      <StatusBadge
                        label={src.active ? "Active" : "Inactive"}
                        tone={src.active ? "success" : "neutral"}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {src.active && nextPay && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => {
                            markIncomeReceived(src.id);
                            toast("Marked as received");
                          }}
                        >
                          Received
                        </Button>
                      )}
                      <RowActions
                        label={src.source}
                        onEdit={() => {
                          setEditing(src);
                          setOpen(true);
                        }}
                        onDelete={() => {
                          deleteIncome(src.id);
                          toast("Income source deleted");
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit income source" : "Add income source"}
        description="Stored locally in your browser."
      >
        <IncomeForm
          initial={editing ?? undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(draft) => {
            if (editing) {
              updateIncome(editing.id, draft);
              toast("Income updated");
            } else {
              addIncome(draft);
              toast("Income added");
            }
            setOpen(false);
          }}
        />
      </Dialog>
    </Card>
  );
}
