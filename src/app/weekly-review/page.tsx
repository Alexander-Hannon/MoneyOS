import { AppShell } from "@/components/layout/AppShell";
import { WeeklyReviewDashboard } from "@/components/weekly-review/WeeklyReviewDashboard";

export const metadata = {
  title: "Weekly Review · MoneyOS",
  description: "AJ's weekly money review command center.",
};

export default function WeeklyReviewPage() {
  return (
    <AppShell>
      <WeeklyReviewDashboard />
    </AppShell>
  );
}
