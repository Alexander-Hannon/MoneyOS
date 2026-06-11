import { PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/money-utils";
import type { PlannedExpense, Tone } from "@/lib/types/money";

const statusTone: Record<PlannedExpense["status"], Tone> = {
  saving: "info",
  planned: "neutral",
  scheduled: "success",
};

export function SpendingLater({ items }: { items: PlannedExpense[] }) {
  const known = items
    .filter((i) => i.amount != null)
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={PiggyBank}
          title="Spending Later"
          description="Future obligations and money to set aside"
          meta={`${formatCurrency(known)} planned`}
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-md)] border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-foreground/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.category}
                    {item.targetDate ? ` · by ${formatDate(item.targetDate)}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {item.amount == null ? "TBD" : formatCurrency(item.amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge label={item.status} tone={statusTone[item.status]} />
                {item.notes && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
