import { TrendingUp } from "lucide-react";
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
  formatCurrency,
  formatDate,
  frequencyLabel,
  toneForReliability,
} from "@/lib/money-utils";
import type { IncomeSource } from "@/lib/types/money";

function expectedLabel(src: IncomeSource): string {
  const base = src.expectedAmount === null ? "Variable" : formatCurrency(src.expectedAmount);
  return src.amountNote ? `${base} ${src.amountNote}` : base;
}

export function IncomePipeline({ income }: { income: IncomeSource[] }) {
  const activeCount = income.filter((i) => i.active).length;

  return (
    <Card>
      <CardContent className="pt-5">
        <SectionHeader
          icon={TrendingUp}
          title="Income Pipeline"
          description="Where money comes from and how reliable it is"
          meta={`${activeCount} active`}
        />
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Source</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Reliability</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {income.map((src) => (
              <TableRow key={src.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {src.source}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {expectedLabel(src)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {frequencyLabel(src.frequency)}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={src.reliability}
                    tone={toneForReliability(src.reliability)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {src.active ? (
                    <span className="text-success">Active now</span>
                  ) : src.startDate ? (
                    <span className="text-muted-foreground">
                      {formatDate(src.startDate)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                  {src.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
