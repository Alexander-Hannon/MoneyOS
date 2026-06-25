import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export const metadata = {
  title: "Settings · MoneyOS",
  description: "MoneyOS settings — data source, export, and privacy controls.",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
