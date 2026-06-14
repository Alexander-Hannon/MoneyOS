import type { PlannedExpense } from "@/types/money";

// Future / planned spending — demo seed data.
export const mockSpendingLater: PlannedExpense[] = [
  {
    id: "home-insurance-balance",
    name: "Home Insurance — full year",
    amount: 688,
    targetDate: "2026-09-03",
    category: "Insurance",
    status: "saving",
    notes: "$688 due 9/3, remaining balance due end of year.",
  },
  {
    id: "emergency-buffer",
    name: "Emergency buffer top-up",
    amount: 1000,
    category: "Safety net",
    status: "saving",
    notes: "Goal: keep one month of bills in reserve.",
  },
  {
    id: "car-maintenance",
    name: "Car maintenance fund",
    amount: 400,
    category: "Transport",
    status: "planned",
    notes: "Tires + service later this year.",
  },
  {
    id: "secondary-onboarding",
    name: "Secondary job start-up costs",
    amount: null,
    targetDate: "2026-08-12",
    category: "Work",
    status: "planned",
    notes: "Possible upfront costs when secondary income begins (demo).",
  },
];
