import { Dashboard } from "@/components/dashboard/Dashboard";

// Rendered per request so the initial HTML matches the client's default state
// (the client store hydrates any saved edits from localStorage after mount).
export const dynamic = "force-dynamic";

export default function Page() {
  return <Dashboard />;
}
