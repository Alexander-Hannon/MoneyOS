import { NetWorthPageClient } from "@/components/history/NetWorthPageClient";

export const metadata = {
  title: "Net worth · MoneyOS",
  description: "Recorded balance history for linked accounts.",
};

export default function NetWorthPage() {
  return <NetWorthPageClient />;
}
