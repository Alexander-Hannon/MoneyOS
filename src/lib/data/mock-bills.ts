import type { Bill } from "@/types/money";
import { getDemoBills } from "@/lib/data/demo-user-data";

/** Demo bills — dates computed at render time. See demo-user-data.ts. */
export function getMockBills(): Bill[] {
  return getDemoBills();
}
