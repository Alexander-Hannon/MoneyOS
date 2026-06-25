"use client";

import { useState } from "react";
import { Check, ExternalLink, Minus, Plus, Receipt } from "lucide-react";
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
  daysUntil,
  formatCurrency,
  formatDate,
  formatRelativeDays,
  toneForBillStatus,
} from "@/lib/money-utils";
import { useMoneyData } from "@/lib/storage/store";
import { useToast } from "@/components/ui/toast";
import type { Bill, BillStatus } from "@/types/money";

function amountLabel(bill: Bill): string {
  if (bill.amount === null) return "Variable";
  return `${bill.amountType === "estimate" ? "~" : ""}${formatCurrency(bill.amount, true)}`;
}

const statusOptions: BillStatus[] = ["unpaid", "scheduled", "paid", "review"];

export function BillsCommandCenter({
  dueOnly = false,
}: {
  dueOnly?: boolean;
}) {
  const { bills, addBill, updateBill, deleteBill, setBillStatus } = useMoneyData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  const sorted = [...bills]
    .filter((bill) => {
      if (!dueOnly) return true;
      if (bill.status === "paid") return false;
      return daysUntil(bill.dueDate) <= 14;
    })
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const due = billsDueWithin(bills, 14);

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Receipt}
          title="Bills Command Center"
          description="Every recurring obligation in one place"
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Bill</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Autopay</TableHead>
                <TableHead>Paid From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((bill) => {
                const d = daysUntil(bill.dueDate);
                return (
                  <TableRow key={bill.id}>
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
                      <div className="text-sm">{formatDate(bill.dueDate)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeDays(d)}
                      </div>
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
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={bill.status}
                          tone={toneForBillStatus(bill.status)}
                        />
                        <select
                          aria-label={`Set status for ${bill.name}`}
                          value={bill.status}
                          onChange={(e) =>
                            setBillStatus(bill.id, e.target.value as BillStatus)
                          }
                          className="rounded-md border border-input bg-background/60 px-1.5 py-1 text-xs text-muted-foreground outline-none focus:border-ring"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bill.paymentUrl ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 text-xs"
                          onClick={() =>
                            window.open(
                              bill.paymentUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink className="size-3" />
                          Open payment
                        </Button>
                      ) : bill.paymentInstructions ? (
                        <span
                          className="max-w-[140px] truncate text-xs text-muted-foreground"
                          title={bill.paymentInstructions}
                        >
                          Payment notes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No payment link
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <RowActions
                          label={bill.name}
                          onEdit={() => {
                            setEditing(bill);
                            setOpen(true);
                          }}
                          onDelete={() => {
                            deleteBill(bill.id);
                            toast("Bill deleted");
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

        <p className="mt-3 text-[11px] text-muted-foreground">
          MoneyOS opens payment links only. It does not pay bills automatically.
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
