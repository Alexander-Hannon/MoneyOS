// Maps Plaid SDK shapes into MoneyOS domain types. Server-side only.
// Returns plain, token-free data that is safe to send to the client.

import type { AccountBase, Transaction } from "plaid";
import type {
  LinkedAccount,
  LinkedAccountType,
  MoneyTransaction,
  TransactionType,
} from "@/types/transactions";
import { categorizeMerchant } from "@/lib/transaction-utils";

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

export function normalizeTransaction(txn: Transaction): MoneyTransaction {
  const merchantName = txn.merchant_name ?? txn.name;
  // Plaid: positive amount = money leaving the account. MoneyOS: negative =
  // outflow, positive = inflow. So invert the sign.
  const amount = -txn.amount;
  const type: TransactionType = amount < 0 ? "debit" : "income";
  const { category, needsReview } = categorizeMerchant(merchantName);

  return {
    id: txn.transaction_id,
    accountId: txn.account_id,
    date: txn.date,
    merchantName,
    description: txn.name,
    amount,
    type,
    category,
    subcategory: txn.personal_finance_category?.detailed ?? undefined,
    pending: txn.pending,
    source: "plaid_sandbox",
    needsReview,
  };
}
