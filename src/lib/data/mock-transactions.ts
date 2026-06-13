import type { LinkedAccount, MoneyTransaction } from "@/types/transactions";
import { daysFromNow } from "@/lib/money-utils";

// Mock accounts. `source: "mock"` keeps them clearly separate from any future
// Plaid sandbox/live data. No real balances or tokens are involved.
export const mockLinkedAccounts: LinkedAccount[] = [
  {
    id: "acc-checking",
    name: "Everyday Checking",
    institution: "Mock Bank",
    type: "checking",
    subtype: "checking",
    mask: "4821",
    currentBalance: 1450.18,
    availableBalance: 1450.18,
    source: "mock",
    connectionStatus: "not_connected",
  },
  {
    id: "acc-credit",
    name: "Rewards Credit Card",
    institution: "Mock Bank",
    type: "credit",
    subtype: "credit card",
    mask: "9930",
    currentBalance: -612.34,
    availableBalance: 4387.66,
    source: "mock",
    connectionStatus: "not_connected",
  },
  {
    id: "acc-savings",
    name: "Safety Net Savings",
    institution: "Mock Bank",
    type: "savings",
    subtype: "savings",
    mask: "1102",
    currentBalance: 3200.0,
    availableBalance: 3200.0,
    source: "mock",
    connectionStatus: "not_connected",
  },
];

// Mock transactions for the current month. Outflow is negative, inflow positive.
// Returned from a function so the relative dates are computed at render time,
// keeping SSR and client hydration in the same calendar day.
export function getMockTransactions(): MoneyTransaction[] {
  return [
  { id: "t1", accountId: "acc-checking", date: daysFromNow(-2), merchantName: "Whole Foods", description: "Groceries", amount: -86.4, type: "debit", category: "Food", subcategory: "Groceries", pending: false, source: "mock", needsReview: false },
  { id: "t2", accountId: "acc-checking", date: daysFromNow(-9), merchantName: "Trader Joe's", description: "Groceries", amount: -52.18, type: "debit", category: "Food", subcategory: "Groceries", pending: false, source: "mock", needsReview: false },
  { id: "t3", accountId: "acc-credit", date: daysFromNow(-3), merchantName: "Shell", description: "Fuel", amount: -41.2, type: "debit", category: "Gas", pending: false, source: "mock", needsReview: false },
  { id: "t4", accountId: "acc-credit", date: daysFromNow(-12), merchantName: "Chevron", description: "Fuel", amount: -38.75, type: "debit", category: "Gas", pending: false, source: "mock", needsReview: false },
  { id: "t5", accountId: "acc-checking", date: daysFromNow(-7), merchantName: "City Gym", description: "Membership", amount: -49.0, type: "debit", category: "Fitness", pending: false, source: "mock", needsReview: false },
  { id: "t6", accountId: "acc-credit", date: daysFromNow(-1), merchantName: "Amazon", description: "Household", amount: -64.99, type: "debit", category: "Convenience / Shopping", pending: false, source: "mock", needsReview: false },
  { id: "t7", accountId: "acc-credit", date: daysFromNow(-10), merchantName: "Amazon", description: "Electronics", amount: -23.49, type: "debit", category: "Convenience / Shopping", pending: false, source: "mock", needsReview: false },
  { id: "t8", accountId: "acc-credit", date: daysFromNow(-5), merchantName: "Cursor", description: "Cursor Pro", amount: -20.0, type: "debit", category: "Business / Productivity", pending: false, source: "mock", needsReview: false },
  { id: "t9", accountId: "acc-credit", date: daysFromNow(-6), merchantName: "iCloud", description: "iCloud+ storage", amount: -9.99, type: "debit", category: "Tech", pending: false, source: "mock", needsReview: false },
  { id: "t10", accountId: "acc-credit", date: daysFromNow(-1), merchantName: "Chipotle", description: "Lunch", amount: -14.85, type: "debit", category: "Food", subcategory: "Dining", pending: true, source: "mock", needsReview: false },
  { id: "t11", accountId: "acc-credit", date: daysFromNow(-4), merchantName: "Starbucks", description: "Coffee", amount: -6.45, type: "debit", category: "Food", subcategory: "Dining", pending: false, source: "mock", needsReview: false },
  { id: "t12", accountId: "acc-credit", date: daysFromNow(-8), merchantName: "Olive Garden", description: "Dinner", amount: -58.2, type: "debit", category: "Food", subcategory: "Dining", pending: false, source: "mock", needsReview: false },
  { id: "t13", accountId: "acc-checking", date: daysFromNow(-2), merchantName: "Credit Card Payment", description: "Payment to Rewards Card", amount: -640.0, type: "payment", category: "Bills", pending: false, source: "mock", needsReview: false, notes: "Paid from savings — flagged for review." },
  { id: "t14", accountId: "acc-checking", date: daysFromNow(-5), merchantName: "Rumble Boxing", description: "Biweekly pay", amount: 350.0, type: "income", category: "Income", pending: false, source: "mock", needsReview: false },
  { id: "t15", accountId: "acc-checking", date: daysFromNow(-5), merchantName: "Transfer to Savings", description: "Monthly transfer", amount: -300.0, type: "transfer", category: "Transfer", pending: false, source: "mock", needsReview: false },
  { id: "t16", accountId: "acc-checking", date: daysFromNow(-11), merchantName: "City Utilities", description: "Electricity + water", amount: -132.5, type: "debit", category: "Bills", pending: false, source: "mock", needsReview: false },
  { id: "t17", accountId: "acc-checking", date: daysFromNow(-4), merchantName: "Security System", description: "Monthly monitoring", amount: -40.0, type: "debit", category: "Bills", pending: false, source: "mock", needsReview: false },
  { id: "t18", accountId: "acc-credit", date: daysFromNow(-3), merchantName: "Hulu", description: "Streaming", amount: -17.99, type: "debit", category: "Tech", pending: false, source: "mock", needsReview: false },
  { id: "t19", accountId: "acc-credit", date: daysFromNow(-14), merchantName: "Hulu", description: "Streaming", amount: -17.99, type: "debit", category: "Tech", pending: false, source: "mock", needsReview: false, notes: "Charged twice this period." },
  { id: "t20", accountId: "acc-credit", date: daysFromNow(-2), merchantName: "SQ *VND8841", description: "Card purchase", amount: -27.0, type: "debit", category: "Review", pending: false, source: "mock", needsReview: true },
  { id: "t21", accountId: "acc-credit", date: daysFromNow(-6), merchantName: "POS PURCHASE 0099", description: "Card purchase", amount: -12.34, type: "debit", category: "Review", pending: false, source: "mock", needsReview: true },
  { id: "t22", accountId: "acc-credit", date: daysFromNow(-9), merchantName: "CapCut + Outlook", description: "Bundle", amount: -7.99, type: "debit", category: "Business / Productivity", pending: false, source: "mock", needsReview: false },
  { id: "t23", accountId: "acc-credit", date: daysFromNow(-13), merchantName: "The Local Kitchen", description: "Dinner", amount: -33.1, type: "debit", category: "Food", subcategory: "Dining", pending: false, source: "mock", needsReview: false },
  { id: "t24", accountId: "acc-credit", date: daysFromNow(-7), merchantName: "Amazon", description: "Returned item", amount: 23.49, type: "refund", category: "Convenience / Shopping", pending: false, source: "mock", needsReview: false },
  ];
}
