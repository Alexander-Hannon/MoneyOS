// Maps Plaid SDK shapes into MoneyOS domain types. Server-side only.
// Returns plain, token-free data that is safe to send to the client.

import type { AccountBase, Transaction } from "plaid";
import type {
  LinkedAccount,
  LinkedAccountType,
  MoneyTransaction,
} from "@/types/transactions";
import { classifyTransaction } from "@/lib/transaction-utils";

function mapAccountType(type: string, subtype: string | null): LinkedAccountType {
  switch (type) {
    case "depository":
      return subtype === "savings" ? "savings" : "checking";
    case "credit":
      return "credit";
    case "loan":
      return "loan";
    case "investment":
    case "brokerage":
      return "investment";
    default:
      return "other";
  }
}

export function normalizeAccount(
  account: AccountBase,
  institution: string,
): LinkedAccount {
  return {
    id: account.account_id,
    name: account.name,
    institution,
    type: mapAccountType(account.type, account.subtype ?? null),
    subtype: account.subtype ?? undefined,
    mask: account.mask ?? undefined,
    currentBalance: account.balances.current ?? undefined,
    availableBalance: account.balances.available ?? undefined,
    source: "plaid_sandbox",
    connectionStatus: "connected",
  };
}

/** Classify and map a Plaid transaction into MoneyOS shape. */
export function normalizePlaidTransaction(txn: Transaction): MoneyTransaction {
  const merchantName = txn.merchant_name ?? txn.name;
  // Plaid: positive amount = money leaving the account. MoneyOS: negative =
  // outflow, positive = inflow. So invert the sign.
  const amount = -txn.amount;

  const classified = classifyTransaction({
    merchantName,
    description: txn.name,
    amount,
    plaidPrimary: txn.personal_finance_category?.primary ?? null,
    plaidDetailed: txn.personal_finance_category?.detailed ?? null,
  });

  return {
    id: txn.transaction_id,
    accountId: txn.account_id,
    date: txn.date,
    merchantName,
    description: txn.name,
    amount,
    type: classified.type,
    classification: classified.classification,
    category: classified.category,
    subcategory: txn.personal_finance_category?.detailed ?? undefined,
    pending: txn.pending,
    source: "plaid_sandbox",
    needsReview: classified.needsReview,
  };
}

/** @deprecated Use normalizePlaidTransaction */
export const normalizeTransaction = normalizePlaidTransaction;
