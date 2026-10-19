import { RunwayPageClient } from "@/components/runway/RunwayPageClient";

export const metadata = {
  title: "Runway · MoneyOS",
  description: "Day-by-day projected cash from confirmed bills, subscriptions, and income.",
};

export default function RunwayPage() {
  return <RunwayPageClient />;
}
