import { Suspense } from "react";
import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { SpendingDashboard } from "@/components/spending/SpendingDashboard";

export const metadata = {
  title: "Spending",
  description: "Review transactions, categories, and spending trends.",
};

export default function SpendingPage() {
  return (
    <TaskPageShell
      title="Spending"
      description="Transactions, categories, and trends"
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading spending data…</p>
        }
      >
        <SpendingDashboard />
      </Suspense>
    </TaskPageShell>
  );
}
