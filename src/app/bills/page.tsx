"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { BillsCommandCenter } from "@/components/dashboard/BillsCommandCenter";

function BillsPageContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  return (
    <div className="space-y-4">
      {filter === "due" ? (
        <div className="rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <span className="font-medium">Filter: Bills due soon</span>
        </div>
      ) : null}
      <BillsCommandCenter dueOnly={filter === "due"} />
    </div>
  );
}

export default function BillsPage() {
  return (
    <TaskPageShell title="Bills" description="Recurring obligations and due dates">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading bills…</p>
        }
      >
        <BillsPageContent />
      </Suspense>
    </TaskPageShell>
  );
}
