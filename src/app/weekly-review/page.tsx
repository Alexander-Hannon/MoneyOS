import { AppShell } from "@/components/layout/AppShell";
import { WeeklyReviewDashboard } from "@/components/weekly-review/WeeklyReviewDashboard";

export const metadata = {
  title: "Weekly Review",
  description: "A weekly review of what's due, what changed, and what to do next.",
};

export default function WeeklyReviewPage() {
  return (
    <AppShell>
      <WeeklyReviewDashboard />
    </AppShell>
  );
}
