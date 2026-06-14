import type { IncomeSource } from "@/types/money";
import { getDemoIncome } from "@/lib/data/demo-user-data";

/** Demo income — dates computed at render time. See demo-user-data.ts. */
export function getMockIncome(): IncomeSource[] {
  return getDemoIncome();
}
