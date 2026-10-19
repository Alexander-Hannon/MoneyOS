"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFinancialData } from "@/hooks/useFinancialData";
import { computeSetupChecklist, markSetupSkipped } from "@/lib/setup-checklist";

export function SetupChecklistCard() {
  const fd = useFinancialData();
  const [skipVersion, setSkipVersion] = useState(0);
  const checklist = useMemo(() => {
    void skipVersion;
    return computeSetupChecklist(fd);
  }, [fd, skipVersion]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="size-4 text-primary" />
              Personal setup checklist
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {checklist.completeCount}/{checklist.totalCount} core items ·{" "}
              {checklist.percentComplete}% complete
            </p>
          </div>
          {checklist.readyForWeeklyUse && (
            <span className="rounded-[3px] border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              MoneyOS is ready for weekly use
            </span>
          )}
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${checklist.percentComplete}%` }}
          />
        </div>

        <ul className="space-y-2">
          {checklist.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-border/60 bg-muted/15 px-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                {item.complete ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <Link
                    href={item.href}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {item.label}
                  </Link>
                  {item.optional && (
                    <p className="text-[10px] text-muted-foreground">Optional</p>
                  )}
                </div>
              </div>
              {!item.complete && item.id === "bills" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => {
                    markSetupSkipped("bills");
                    setSkipVersion((v) => v + 1);
                  }}
                >
                  Skip
                </Button>
              )}
              {!item.complete && item.id === "subscriptions" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => {
                    markSetupSkipped("subscriptions");
                    setSkipVersion((v) => v + 1);
                  }}
                >
                  Skip
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
