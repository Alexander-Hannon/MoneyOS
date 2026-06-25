import { SubscriptionsPageClient } from "@/components/subscriptions/SubscriptionsPageClient";

export const metadata = {
  title: "Subscriptions · MoneyOS",
  description: "Review subscriptions and detected recurring charges.",
};

export default function SubscriptionsPage() {
  return <SubscriptionsPageClient />;
}
