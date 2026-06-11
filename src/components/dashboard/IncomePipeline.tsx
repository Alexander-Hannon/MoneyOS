import { Banknote, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  daysUntil,
  formatCurrency,
  formatDate,
  formatRelativeDays,
  monthlyAmount,
  monthlyIncome,
} from "@/lib/finance";
import type { IncomeSource } from "@/lib/types";

function statusBadge(status: IncomeSource["status"]) {
  if (status === "received") return <Badge variant="success">Received</Badge>;
  if (status === "late") return <Badge variant="destructive">Late</Badge>;
  return <Badge variant="info">Expected</Badge>;
}

export function IncomePipeline({ income }: { income: IncomeSource[] }) {
  const total = monthlyIncome(income);
  const sorted = [...income].sort(
    (a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime(),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="size-4 text-primary" />
          Income Pipeline
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(total)}/mo
        </span>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {sorted.map((src) => {
          const due = daysUntil(src.nextDate);
          return (
            <div
              key={src.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border/60 bg-muted/20 px-3.5 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Banknote className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{src.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {src.type} ·{" "}
                    {src.status === "received"
                      ? `paid ${formatRelativeDays(due)}`
                      : `${formatDate(src.nextDate)} (${formatRelativeDays(due)})`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(monthlyAmount(src.amount, src.cadence))}
                </span>
                {statusBadge(src.status)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
