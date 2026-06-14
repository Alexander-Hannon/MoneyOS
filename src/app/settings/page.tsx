import Link from "next/link";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata = {
  title: "Settings · MoneyOS",
  description: "MoneyOS settings — data source, export, and privacy controls.",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to MoneyOS
        </Link>
      </p>
      <div className="mt-4">
        <SettingsPanel />
      </div>
    </main>
  );
}
