import { Header } from "@/components/layout/Header";
import { WeeklyReviewDashboard } from "@/components/weekly-review/WeeklyReviewDashboard";

export const metadata = {
  title: "Weekly Review · MoneyOS",
  description: "AJ's weekly money review command center.",
};

export default function WeeklyReviewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <WeeklyReviewDashboard />
      </main>
    </div>
  );
}
