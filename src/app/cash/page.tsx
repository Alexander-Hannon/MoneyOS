import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { CashDashboard } from "@/components/cash/CashDashboard";

export const metadata = {
  title: "Cash & Accounts | MoneyOS",
  description: "Cash available breakdown across live and manual accounts.",
};

export default function CashPage() {
  return (
    <TaskPageShell
      title="Cash & Accounts"
      description="Transparent cash available across connected and manual accounts"
    >
      <CashDashboard />
    </TaskPageShell>
  );
}
