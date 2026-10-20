import { TaskPageShell } from "@/components/layout/TaskPageShell";
import { SpendingLater } from "@/components/dashboard/SpendingLater";

export const metadata = {
  title: "Spending Later",
  description: "Planned future spending and savings goals.",
};

export default function SpendingLaterPage() {
  return (
    <TaskPageShell
      title="Spending Later"
      description="Planned purchases and savings targets"
    >
      <SpendingLater />
    </TaskPageShell>
  );
}
