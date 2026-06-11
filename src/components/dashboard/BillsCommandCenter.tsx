import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatCurrency, formatDate, formatRelativeDays } from "@/lib/finance";
import type { Bill } from "@/lib/types";

function statusBadge(bill: Bill, due: number) {
  if (bill.status === "paid") return <Badge variant="outline">Paid</Badge>;
  if (due < 0) return <Badge variant="destructive">Overdue</Badge>;
  if (bill.autopay) return <Badge variant="info">Autopay</Badge>;
  if (due <= 3) return <Badge variant="warning">Due soon</Badge>;
  return <Badge variant="secondary">Scheduled</Badge>;
}

export function BillsCommandCenter({ bills }: { bills: Bill[] }) {
  const sorted = [...bills].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
  const unpaidTotal = bills
    .filter((b) => b.status !== "paid")
    .reduce((s, b) => s + b.amount, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CalendarClock className="size-4 text-warning" />
          Bills Command Center
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(unpaidTotal)} outstanding
        </span>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Bill</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((bill) => {
              const due = daysUntil(bill.dueDate);
              return (
                <TableRow key={bill.id}>
                  <TableCell>
                    <div className="font-medium">{bill.name}</div>
                    <div className="text-xs text-muted-foreground">{bill.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(bill.dueDate)}</div>
                    <div className="text-xs text-muted-foreground">
                      {bill.status === "paid" ? "paid" : formatRelativeDays(due)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(bill.amount)}
                  </TableCell>
                  <TableCell className="text-right">{statusBadge(bill, due)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
