import type { Subscription } from "@/types/money";
import { getDemoSubscriptions } from "@/lib/data/demo-user-data";

/** Demo subscriptions — see demo-user-data.ts. */
export function getMockSubscriptions(): Subscription[] {
  return getDemoSubscriptions();
}
