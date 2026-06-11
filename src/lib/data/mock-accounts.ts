import type { Account } from "@/lib/types/money";

// Manual/mock balances — no real bank data. "Total cash available" sums only
// accessible accounts (the Citizens school account is mom-managed).
export const mockAccounts: Account[] = [
  {
    id: "bills",
    name: "Bills Account",
    type: "checking",
    balance: 1450.18,
    accessible: true,
    notes: "Primary account autopay bills draw from.",
  },
  {
    id: "savings",
    name: "Savings Account",
    type: "savings",
    balance: 3200.0,
    accessible: true,
    notes: "Currently funding the credit card payment.",
  },
  {
    id: "cashapp",
    name: "Cash App",
    type: "cash",
    balance: 120.5,
    accessible: true,
    notes: "Used for Lawn Care.",
  },
  {
    id: "citizens",
    name: "Citizens School Account",
    type: "external",
    balance: 0,
    accessible: false,
    notes: "Mom-managed — no direct access.",
  },
];
