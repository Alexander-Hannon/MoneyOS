"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ExternalLink, Minus, Plus, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RowActions } from "@/components/shared/RowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { BillForm } from "@/components/forms/BillForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  billsDueWithin,
  formatCurrency,
  formatDate,
  formatRelativeDays,
} from "@/lib/money-utils";
import { partitionBills, phaseTone, type BillOccurrenceView } from "@/lib/obligations-lifecycle";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { Bill } from "@/types/money";

function amountLabel(bill: Bill): string {
  if (bill.amount === null) return "Variable";
  return `${bill.amountType === "estimate" ? "~" : ""}${formatCurrency(bill.amount, true)}`;
}

function BillRow({
  view,
  onEdit,
  onDelete,
  onMarkPaid,
  onMarkScheduled,
}: {
  view: BillOccurrenceView;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onMarkScheduled: () => void;
}) {
  const { bill, occurrenceDate, phase, displayLabel, daysUntil } = view;
  const isCompleted = view.section === "completed";

  return (
    <TableRow>
      <TableCell className="font-medium whitespace-nowrap">
        {bill.name}
        {bill.notes && (
          <div className="max-w-[200px] truncate text-xs text-muted-foreground">
            {bill.notes}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap">
        {amountLabel(bill)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <div className="text-sm">{formatDate(occurrenceDate)}</div>
        <div className="text-xs text-muted-foreground">
          {formatRelativeDays(daysUntil)}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge label={displayLabel} tone={phaseTone(phase)} />
      </TableCell>
      <TableCell>
        {bill.autopay ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" /> Auto
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="size-3.5" /> Manual
          </span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {bill.paidFrom}
      </TableCell>
      <TableCell>
        {bill.paymentUrl ? (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1 text-xs"
            onClick={() =>
              window.open(bill.paymentUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="size-3" />
            Open payment
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No payment link</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {!isCompleted && phase !== "scheduled" && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={onMarkScheduled}
            >
              Schedule
            </Button>
          )}
          {!isCompleted && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onMarkPaid}
            >
              Mark paid
            </Button>
          )}
          <RowActions label={bill.name} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function BillsCommandCenter({
  dueOnly = false,
}: {
  dueOnly?: boolean;
}) {
  const { bills, addBill, updateBill, deleteBill, markBillPaid, markBillScheduled } =
    useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);

  const { active, completed } = useMemo(() => partitionBills(bills), [bills]);

  const visibleActive = useMemo(() => {
    if (!dueOnly) return active;
    return active.filter((view) => view.daysUntil <= 14);
  }, [active, dueOnly]);

  const due = billsDueWithin(bills, 14);

  const tableHeader = (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>Bill</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead>Due</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Autopay</TableHead>
        <TableHead>Paid From</TableHead>
        <TableHead>Payment</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Receipt}
          title="Bills Command Center"
          description="Active obligations roll forward automatically each cycle"
          meta={`${formatCurrency(due.total)} due in 14 days`}
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> Add bill
            </Button>
          }
        />

        {bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills added yet."
            description="Add your recurring bills to start tracking what's due."
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Active / Upcoming ({visibleActive.length})
              </h3>
              {visibleActive.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active bills in this view. Completed items are below.
                </p>
              ) : (
                <Table>
                  {tableHeader}
                  <TableBody>
                    {visibleActive.map((view) => (
                      <BillRow
                        key={`${view.bill.id}-${view.occurrenceDate}-active`}
                        view={view}
                        onEdit={() => {
                          setEditing(view.bill);
                          setOpen(true);
                        }}
                        onDelete={() => {
                          deleteBill(view.bill.id);
                          toast("Bill deleted");
                        }}
                        onMarkPaid={() => {
                          markBillPaid(view.bill.id);
                          toast("Bill marked paid for this cycle");
                        }}
                        onMarkScheduled={() => {
                          markBillScheduled(view.bill.id);
                          toast("Bill marked scheduled");
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {completed.length > 0 && (
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
                  Paid / Completed This Cycle ({completed.length})
                </button>
                {completedOpen && (
                  <Table>
                    {tableHeader}
                    <TableBody>
                      {completed.map((view) => (
                        <BillRow
                          key={`${view.bill.id}-${view.occurrenceDate}-done`}
                          view={view}
                          onEdit={() => {
                            setEditing(view.bill);
                            setOpen(true);
                          }}
                          onDelete={() => {
                            deleteBill(view.bill.id);
                            toast("Bill deleted");
                          }}
                          onMarkPaid={() => {}}
                          onMarkScheduled={() => {}}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          MoneyOS opens payment links only. It does not pay bills automatically.
          Marking paid records this cycle only — the next recurrence appears automatically.
        </p>
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit bill" : "Add bill"}
        description="Stored locally in your browser."
      >
        <BillForm
          initial={editing ?? undefined}
          onCancel={() => setOpen(false)}
          onSubmit={(draft) => {
            if (editing) {
              updateBill(editing.id, draft);
              toast("Bill updated");
            } else {
              addBill(draft);
              toast("Bill added");
            }
            setOpen(false);
          }}
        />
      </Dialog>
    </Card>
  );
}
