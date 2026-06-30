"use client";

import { Suspense } from "react";
import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { RecurringCommandCenter } from "@/components/recurring/RecurringCommandCenter";

export default function RecurringPage() {
  return (
    <TaskPageShell
      title="Recurring Command Center"
      description="Confirmed obligations, detected candidates, and reconciled activity"
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading recurring data…</p>
        }
      >
        <RecurringCommandCenter />
      </Suspense>
    </TaskPageShell>
  );
}
