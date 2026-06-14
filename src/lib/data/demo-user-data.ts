/**
 * Demo / local seed data for MoneyOS development.
 *
 * This is NOT real user data. Defaults are generic enough for product demos.
 * Production data will come from user input, Plaid, and a database later.
 */

import type { Account, Alert, Bill, IncomeSource } from "@/types/money";
import { daysFromNow, nextMonthlyDate } from "@/lib/money-utils";

export const DEMO_DATA_NOTICE =
  "Demo seed data — local development only. Edit or reset in the app.";

export const demoAccounts: Account[] = [
  {
    id: "bills",
    name: "Bills Account",
    type: "checking",
    balance: 1450.18,
    accessible: true,
    notes: "Primary checking — autopay bills draw from here.",
  },
  {
    id: "savings",
    name: "Savings Account",
    type: "savings",
    balance: 3200.0,
    accessible: true,
    notes: "Currently funding the credit card payment (demo scenario).",
  },
  {
    id: "cashapp",
    name: "Cash App",
    type: "cash",
    balance: 120.5,
    accessible: true,
    notes: "Used for occasional service payments.",
  },
  {
    id: "external-managed",
    name: "Externally Managed Account",
    type: "external",
    balance: 0,
    accessible: false,
    notes: "Managed by another party — excluded from available cash.",
  },
];

export function getDemoBills(): Bill[] {
  return [
    {
      id: "security",
      name: "Security System",
      amount: 40,
      amountType: "fixed",
      dueDate: nextMonthlyDate(5),
      frequency: "monthly",
      autopay: true,
      paidFrom: "Bills Account",
      status: "scheduled",
    },
    {
      id: "rent",
      name: "Rent / Mortgage",
      amount: 1100,
      amountType: "fixed",
      dueDate: nextMonthlyDate(15),
      frequency: "monthly",
      autopay: false,
      paidFrom: "Housing payment recipient",
      status: "unpaid",
      notes: "Manual transfer to housing recipient each month (demo).",
    },
    {
      id: "credit-card",
      name: "Credit Card Payment",
      amount: null,
      amountType: "variable",
      dueDate: nextMonthlyDate(19),
      frequency: "monthly",
      autopay: true,
      paidFrom: "Savings Account",
      status: "review",
      notes: "Variable amount — demo flags autopay from savings for review.",
    },
    {
      id: "internet",
      name: "Internet",
      amount: 70,
      amountType: "fixed",
      dueDate: nextMonthlyDate(21),
      frequency: "monthly",
      autopay: true,
      paidFrom: "Bills Account",
      status: "scheduled",
    },
    {
      id: "utilities",
      name: "Utilities",
      amount: 300,
      amountType: "estimate",
      dueDate: nextMonthlyDate(29),
      frequency: "monthly",
      autopay: false,
      paidFrom: "Bills Account",
      status: "unpaid",
      notes: "Estimated ~$300, varies by season.",
    },
    {
      id: "lawn-care",
      name: "Lawn Care",
      amount: 50,
      amountType: "fixed",
      dueDate: daysFromNow(6),
      frequency: "biweekly",
      autopay: false,
      paidFrom: "Cash App",
      status: "unpaid",
      notes: "Every 2 weeks (demo).",
    },
    {
      id: "home-insurance",
      name: "Home Insurance",
      amount: 688,
      amountType: "fixed",
      dueDate: "2026-09-03",
      frequency: "annual",
      autopay: false,
      paidFrom: "Bills Account",
      status: "review",
      notes: "Annual premium — plan ahead (demo).",
    },
  ];
}

export function getDemoIncome(): IncomeSource[] {
  return [
    {
      id: "primary-job",
      source: "Primary job income",
      expectedAmount: 350,
      amountType: "commission",
      frequency: "biweekly",
      reliability: "high",
      active: true,
      nextDate: daysFromNow(9),
      notes: "Base pay plus variable commission — budget on base only (demo).",
    },
    {
      id: "secondary-job",
      source: "Secondary job income",
      expectedAmount: 800,
      amountType: "fixed",
      frequency: "biweekly",
      reliability: "high",
      active: false,
      startDate: "2026-08-12",
      notes: "Starts on a future date — rebalance when active (demo).",
    },
    {
      id: "side-work",
      source: "Side work",
      expectedAmount: null,
      amountType: "variable",
      frequency: "variable",
      reliability: "low",
      active: true,
      notes: "Occasional and unpredictable.",
    },
    {
      id: "business",
      source: "Business income",
      expectedAmount: 0,
      amountType: "variable",
      frequency: "variable",
      reliability: "medium",
      active: true,
      notes: "Currently minimal — ramping up (demo).",
    },
    {
      id: "school-aid",
      source: "School refund / aid",
      expectedAmount: null,
      amountType: "unknown",
      frequency: "semester",
      reliability: "variable",
      active: true,
      notes: "Disbursed per semester (demo).",
    },
    {
      id: "family-support",
      source: "Family support",
      expectedAmount: null,
      amountType: "unknown",
      frequency: "as-needed",
      reliability: "medium",
      active: true,
      notes: "Available as needed (demo).",
    },
  ];
}

export const demoAlerts: Alert[] = [
  {
    id: "cc-source",
    title: "Credit card is auto-paid from Savings",
    description:
      "The variable credit card payment is pulling from the Savings Account instead of Bills or Checking.",
    severity: "high",
    category: "account",
    suggestedAction:
      "Review why the credit card payment comes from savings and decide whether it should move to the Bills Account or Checking.",
    reviewRequired: true,
    status: "active",
  },
  {
    id: "cc-variable",
    title: "Credit card payment is variable",
    description:
      "The amount changes month to month, so the budget needs buffer before the due date.",
    severity: "medium",
    category: "bill",
    suggestedAction: "Confirm the statement balance before the due date.",
    reviewRequired: true,
    status: "active",
  },
  {
    id: "primary-commission",
    title: "Primary job income includes commission",
    description:
      "Only the base pay is dependable; commission varies each pay period.",
    severity: "medium",
    category: "income",
    suggestedAction: "Budget on the base amount and treat commission as upside.",
    reviewRequired: false,
    status: "active",
  },
  {
    id: "home-insurance-future",
    title: "Home insurance obligation on Sep 3, 2026",
    description: "$688 is due 9/3/26 with a remaining balance due end of year.",
    severity: "medium",
    category: "spending",
    suggestedAction: "Start setting aside ~$115/mo so it's covered by September.",
    reviewRequired: true,
    status: "active",
  },
  {
    id: "prime-review",
    title: "Amazon Prime needs review",
    description: "Prime is $14/mo and flagged as a maybe.",
    severity: "low",
    category: "subscription",
    suggestedAction: "Decide whether Prime still earns its keep.",
    reviewRequired: true,
    status: "active",
  },
  {
    id: "capcut-review",
    title: "CapCut needs review",
    description: "Confirm CapCut is still used in the CapCut + Outlook bundle.",
    severity: "low",
    category: "subscription",
    suggestedAction: "Keep Outlook; decide on CapCut specifically.",
    reviewRequired: true,
    status: "active",
  },
  {
    id: "external-account",
    title: "Externally managed account excluded from cash",
    description: "No direct access, so it's excluded from available cash.",
    severity: "low",
    category: "account",
    suggestedAction:
      "Coordinate with the account manager before relying on those funds.",
    reviewRequired: false,
    status: "active",
  },
  {
    id: "secondary-start",
    title: "Secondary job income starts Aug 12",
    description:
      "Additional biweekly income begins Aug 12 and changes the cashflow picture.",
    severity: "low",
    category: "income",
    suggestedAction: "Re-balance the budget once secondary income begins.",
    reviewRequired: false,
    status: "active",
  },
];
