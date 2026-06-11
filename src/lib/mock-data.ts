import type { MoneyOSData } from "@/lib/types";

// Local mock data only — no database, no bank APIs. Dates are generated
// relative to "today" so the dashboard always looks live for AJ.

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function getMockData(): MoneyOSData {
  return {
    accounts: [
      { id: "acc-checking", name: "Everyday Checking", type: "checking", balance: 4820.42 },
      { id: "acc-savings", name: "Safety Net", type: "savings", balance: 11300.0 },
    ],
    bills: [
      { id: "bill-rent", name: "Rent", amount: 2100, dueDate: isoDaysFromNow(2), category: "Housing", autopay: false, status: "due" },
      { id: "bill-cc", name: "Credit Card", amount: 640, dueDate: isoDaysFromNow(4), category: "Debt", autopay: false, status: "due" },
      { id: "bill-electric", name: "Electricity", amount: 132.5, dueDate: isoDaysFromNow(5), category: "Utilities", autopay: true, status: "scheduled" },
      { id: "bill-car", name: "Car Payment", amount: 410, dueDate: isoDaysFromNow(9), category: "Transport", autopay: true, status: "scheduled" },
      { id: "bill-phone", name: "Phone", amount: 85, dueDate: isoDaysFromNow(12), category: "Utilities", autopay: false, status: "due" },
      { id: "bill-internet", name: "Internet", amount: 70, dueDate: isoDaysFromNow(-1), category: "Utilities", autopay: true, status: "paid" },
    ],
    income: [
      { id: "inc-salary", source: "Acme Corp Salary", amount: 5400, cadence: "monthly", nextDate: isoDaysFromNow(6), status: "expected", type: "Salary" },
      { id: "inc-freelance", source: "Freelance Design", amount: 1200, cadence: "monthly", nextDate: isoDaysFromNow(3), status: "expected", type: "Freelance" },
      { id: "inc-dividend", source: "Brokerage Dividends", amount: 95, cadence: "monthly", nextDate: isoDaysFromNow(-2), status: "received", type: "Investment" },
    ],
    subscriptions: [
      { id: "sub-netflix", name: "Netflix", amount: 22.99, cadence: "monthly", category: "Entertainment", nextRenewal: isoDaysFromNow(8), usage: "active" },
      { id: "sub-spotify", name: "Spotify", amount: 11.99, cadence: "monthly", category: "Entertainment", nextRenewal: isoDaysFromNow(14), usage: "active" },
      { id: "sub-adobe", name: "Adobe Creative Cloud", amount: 59.99, cadence: "monthly", category: "Software", nextRenewal: isoDaysFromNow(11), usage: "occasional", priceIncrease: 5 },
      { id: "sub-gym", name: "City Gym", amount: 49, cadence: "monthly", category: "Health", nextRenewal: isoDaysFromNow(7), usage: "unused" },
      { id: "sub-icloud", name: "iCloud+", amount: 2.99, cadence: "monthly", category: "Software", nextRenewal: isoDaysFromNow(20), usage: "active" },
      { id: "sub-chatgpt", name: "ChatGPT Plus", amount: 20, cadence: "monthly", category: "Software", nextRenewal: isoDaysFromNow(16), usage: "active" },
      { id: "sub-prime", name: "Amazon Prime", amount: 139, cadence: "yearly", category: "Shopping", nextRenewal: isoDaysFromNow(25), usage: "active" },
      { id: "sub-notion", name: "Notion AI", amount: 10, cadence: "monthly", category: "Software", nextRenewal: isoDaysFromNow(3), usage: "occasional", trialEndsAt: isoDaysFromNow(3) },
    ],
  };
}
