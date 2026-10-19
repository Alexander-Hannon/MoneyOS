import { MoneyFlowPageClient } from "@/components/flow/MoneyFlowPageClient";

export const metadata = {
  title: "Money flow · MoneyOS",
  description: "Monthly money flow from income to bills, subscriptions, and spending.",
};

export default function MoneyFlowPage() {
  return <MoneyFlowPageClient />;
}
