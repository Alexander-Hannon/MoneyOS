import { Check, Minus, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import type { Bill } from "@/lib/types/money";

function amountLabel(bill: Bill): string {
  if (bill.amount === null) return "Variable";
  return `${bill.amountIsEstimate ? "~" : ""}${formatCurrency(bill.amount, true)}`;
}

export function BillsCommandCenter({ bills }: { bills: Bill[] }) {
  const sorted = [...bills].sort(
    (a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate),
  );
  const due = billsDueWithin(bills, 14);

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={Receipt}
          title="Bills Command Center"
          description="Every recurring obligation in one place"
          meta={`${formatCurrency(due.total)} due in 14 days`}
        />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Bill</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Autopay</TableHead>
              <TableHead>Paid From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((bill) => {
              const d = daysUntil(bill.dueDate);
              return (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {bill.name}
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
                    <StatusBadge
                      label={bill.status}
                      tone={toneForBillStatus(bill.status)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                    {bill.notes ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
