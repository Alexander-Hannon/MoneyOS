import type { Subscription } from "@/lib/types/money";

export const mockSubscriptions: Subscription[] = [
  {
    id: "meal-tracker",
    name: "Meal Tracker",
    amount: 11.99,
    frequency: "annually",
    category: "Fitness",
    status: "keep",
  },
  {
    id: "sleep-tracker",
    name: "Sleep Tracker",
    amount: 2.99,
    frequency: "monthly",
    category: "Fitness",
    status: "keep",
  },
  {
    id: "cursor",
    name: "Cursor",
    amount: 20,
    frequency: "monthly",
    category: "Business / Productivity",
    status: "keep",
  },
  {
    id: "icloud",
    name: "iCloud",
    amount: 9.99,
    frequency: "monthly",
    category: "Tech",
    status: "keep",
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime",
    amount: 14,
    frequency: "monthly",
    category: "Convenience",
    status: "review",
    notes: "Decide whether Prime still earns its keep.",
  },
  {
    id: "capcut-outlook",
    name: "CapCut + Outlook",
    amount: 7.99,
    frequency: "monthly",
    category: "Business",
    status: "review",
    notes: "Review CapCut specifically.",
  },
];
