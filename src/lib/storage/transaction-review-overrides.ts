import { STORAGE_KEYS } from "@/lib/storage/local-storage";
import type { TransactionReviewMeta } from "@/types/transaction-review";
import type { MoneyTransaction } from "@/types/transactions";

type StoredReviewOverride = TransactionReviewMeta & {
  category?: MoneyTransaction["category"];
  classification?: MoneyTransaction["classification"];
  needsReview?: boolean;
  type?: MoneyTransaction["type"];
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadAll(): Record<string, StoredReviewOverride> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.transactionReviewOverrides);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredReviewOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(next: Record<string, StoredReviewOverride>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    STORAGE_KEYS.transactionReviewOverrides,
    JSON.stringify(next),
  );
}

export function loadTransactionReviewOverrides(): Record<
  string,
  StoredReviewOverride
> {
  return loadAll();
}

export function saveTransactionReviewOverride(
  transactionId: string,
  override: StoredReviewOverride,
) {
  const all = loadAll();
  all[transactionId] = override;
  saveAll(all);
}

export function applyTransactionReviewOverrides(
  transactions: MoneyTransaction[],
): MoneyTransaction[] {
  const overrides = loadAll();
  if (Object.keys(overrides).length === 0) return transactions;

  return transactions.map((transaction) => {
    const override = overrides[transaction.id];
    if (!override) return transaction;
    return {
      ...transaction,
      ...override,
      category: override.category ?? transaction.category,
      classification: override.classification ?? transaction.classification,
      needsReview: override.needsReview ?? transaction.needsReview,
      type: override.type ?? transaction.type,
    };
  });
}
