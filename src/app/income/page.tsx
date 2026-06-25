"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { IncomePipeline } from "@/components/dashboard/IncomePipeline";

function IncomePageContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  return (
    <div className="space-y-4">
      {filter === "review" ? (
        <div className="rounded-[var(--radius-md)] border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          <span className="font-medium">
            Filter: Income sources that may need review
          </span>
        </div>
      ) : null}
      <IncomePipeline reviewOnly={filter === "review"} />
    </div>
  );
}

export default function IncomePage() {
  return (
    <TaskPageShell title="Income" description="Expected income sources and reliability">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading income…</p>
        }
      >
        <IncomePageContent />
      </Suspense>
    </TaskPageShell>
  );
}
