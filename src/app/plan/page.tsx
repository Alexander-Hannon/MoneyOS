import { SpendingPlanPageClient } from "@/components/plan/SpendingPlanPageClient";

export const metadata = {
  title: "Spending plan · MoneyOS",
  description: "Flexible monthly spending plan built from fixed costs, savings, and real transactions.",
};

export default function SpendingPlanPage() {
  return <SpendingPlanPageClient />;
}
