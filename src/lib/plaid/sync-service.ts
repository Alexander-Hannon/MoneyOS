import type { RemovedTransaction, Transaction } from "plaid";
import {
  describePlaidError,
  getPlaidClient,
  getPlaidConfig,
} from "@/lib/plaid/client";
import {
  dbAccountToLinkedAccount,
  listPlaidAccountsForUser,
  upsertPlaidAccountsForItem,
} from "@/lib/db/accounts";
import {
  dbTransactionToMoneyTransaction,
  listPlaidTransactionsForUser,
  removePlaidTransactionsByPlaidIds,
  upsertPlaidTransactionsForItem,
} from "@/lib/db/transactions";
import {
  getPlaidItemAccessToken,
  getPlaidItemForUser,
  listActivePlaidItemsForUser,
  updateConnectedInstitutionSync,
  updatePlaidItemSyncState,
} from "@/lib/db/plaid-items";
import {
  listTransactionRulesForUser,
  matchTransactionRule,
  ruleCategoryToTransactionCategory,
} from "@/lib/db/transaction-rules";
import { normalizeAccount, normalizePlaidTransaction } from "@/lib/plaid/normalize";
import type { CountryCode } from "plaid";
import type { LinkedAccount, MoneyTransaction } from "@/types/transactions";
import { classifyTransaction } from "@/lib/transaction-utils";

export type PlaidSyncSummary = {
  plaidItemId: string;
  institutionName: string | null;
  accountCount: number;
  transactionCount: number;
  added: number;
  modified: number;
  removed: number;
  lastSyncAt: string;
};

function applyRuleOverride(
  txn: MoneyTransaction,
  rules: Awaited<ReturnType<typeof listTransactionRulesForUser>>,
): MoneyTransaction {
  const rule = matchTransactionRule(txn.merchantName, rules);
  if (!rule) return txn;

  const category = ruleCategoryToTransactionCategory(rule.category);
  return {
    ...txn,
    category,
    needsReview: false,
    classification: rule.shouldCountAsSpending ? "spending" : "transfer",
  };
}

async function fetchInstitutionName(accessToken: string): Promise<string> {
  const client = getPlaidClient();
  const config = getPlaidConfig();
  if (!client || !config) return "Connected bank";

  try {
    const itemRes = await client.itemGet({ access_token: accessToken });
    const institutionId = itemRes.data.item.institution_id;
    if (!institutionId) return "Connected bank";
    const inst = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: config.countryCodes as CountryCode[],
    });
    return inst.data.institution.name;
  } catch {
    return "Connected bank";
  }
}

export async function syncPlaidItemForUser(
  userId: string,
  plaidItemId: string,
): Promise<PlaidSyncSummary> {
  const item = await getPlaidItemForUser(userId, plaidItemId);
  if (!item || item.status !== "connected") {
    throw new Error("Plaid item not found or disconnected.");
  }

  const accessToken = await getPlaidItemAccessToken(userId, plaidItemId);
  if (!accessToken) {
    throw new Error("Could not decrypt Plaid access token.");
  }

  const client = getPlaidClient();
  const config = getPlaidConfig();
  if (!client || !config) {
    throw new Error("Plaid is not configured.");
  }

  const institution =
    item.institutionName ?? (await fetchInstitutionName(accessToken));

  const accountsRes = await client.accountsGet({ access_token: accessToken });
  const normalizedAccounts = accountsRes.data.accounts.map((a) =>
    normalizeAccount(a, institution),
  );

  const accountIdByPlaid = await upsertPlaidAccountsForItem({
    userId,
    plaidItemId,
    accounts: normalizedAccounts.map((a) => ({
      plaidAccountId: a.id,
      name: a.name,
      institution: a.institution,
      type: a.type,
      subtype: a.subtype ?? null,
      mask: a.mask ?? null,
      currentBalance: a.currentBalance ?? null,
      availableBalance: a.availableBalance ?? null,
    })),
  });

  const rules = await listTransactionRulesForUser(userId);

  let cursor = item.syncCursor ?? undefined;
  let hasMore = true;
  let guard = 0;
  const added: Transaction[] = [];
  const modified: Transaction[] = [];
  const removed: RemovedTransaction[] = [];

  while (hasMore && guard < 20) {
    const res = await client.transactionsSync({
      access_token: accessToken,
      cursor,
    });
    added.push(...res.data.added);
    modified.push(...res.data.modified);
    removed.push(...res.data.removed);
    cursor = res.data.next_cursor;
    hasMore = res.data.has_more;
    guard += 1;
  }

  const upsertBatch = [...added, ...modified].map((txn) => {
    let normalized = normalizePlaidTransaction(txn);
    normalized = applyRuleOverride(normalized, rules);
    const internalAccountId =
      accountIdByPlaid.get(txn.account_id) ??
      accountIdByPlaid.get(normalized.accountId) ??
      normalized.accountId;

    return {
      plaidTransactionId: txn.transaction_id,
      accountId: internalAccountId,
      date: normalized.date,
      merchantName: normalized.merchantName,
      description: normalized.description,
      amount: normalized.amount,
      type: normalized.type,
      classification: normalized.classification,
      category: normalized.category,
      subcategory: normalized.subcategory,
      pending: normalized.pending,
      needsReview: normalized.needsReview,
    };
  });

  await upsertPlaidTransactionsForItem({
    userId,
    plaidItemId,
    transactions: upsertBatch,
  });

  if (removed.length > 0) {
    await removePlaidTransactionsByPlaidIds({
      userId,
      plaidTransactionIds: removed.map((r) => r.transaction_id),
    });
  }

  const lastSyncAt = new Date();
  await updatePlaidItemSyncState({
    userId,
    plaidItemId,
    syncCursor: cursor ?? null,
    lastSyncAt,
  });
  await updateConnectedInstitutionSync(userId, plaidItemId, lastSyncAt);

  const [accounts, transactions] = await Promise.all([
    listPlaidAccountsForUser(userId),
    listPlaidTransactionsForUser(userId),
  ]);

  const itemAccounts = accounts.filter((a) => a.plaidItemId === plaidItemId);

  return {
    plaidItemId,
    institutionName: item.institutionName ?? institution,
    accountCount: itemAccounts.length,
    transactionCount: transactions.filter((t) => t.plaidItemId === plaidItemId)
      .length,
    added: added.length,
    modified: modified.length,
    removed: removed.length,
    lastSyncAt: lastSyncAt.toISOString(),
  };
}

export async function syncAllPlaidItemsForUser(userId: string) {
  const items = await listActivePlaidItemsForUser(userId);
  const summaries: PlaidSyncSummary[] = [];
  for (const item of items) {
    try {
      summaries.push(await syncPlaidItemForUser(userId, item.id));
    } catch (error) {
      summaries.push({
        plaidItemId: item.id,
        institutionName: item.institutionName,
        accountCount: 0,
        transactionCount: 0,
        added: 0,
        modified: 0,
        removed: 0,
        lastSyncAt: new Date().toISOString(),
      });
      void describePlaidError(error);
    }
  }
  return summaries;
}

export async function loadPersistedPlaidDataForUser(userId: string): Promise<{
  accounts: LinkedAccount[];
  transactions: MoneyTransaction[];
  lastSyncAt: string | null;
}> {
  const [accounts, transactions, items] = await Promise.all([
    listPlaidAccountsForUser(userId),
    listPlaidTransactionsForUser(userId),
    listActivePlaidItemsForUser(userId),
  ]);

  const lastSyncAt =
    items
      .map((i) => i.lastSyncAt)
      .filter(Boolean)
      .sort((a, b) => (b!.getTime() ?? 0) - (a!.getTime() ?? 0))[0]
      ?.toISOString() ?? null;

  return {
    accounts: accounts.map(dbAccountToLinkedAccount),
    transactions: transactions.map(dbTransactionToMoneyTransaction),
    lastSyncAt,
  };
}

/** Apply user-approved rules to a classification suggestion input. */
export function applyPersistentRulesToClassification(args: {
  merchantName: string;
  rules: Awaited<ReturnType<typeof listTransactionRulesForUser>>;
}) {
  const rule = matchTransactionRule(args.merchantName, args.rules);
  if (!rule) return null;
  const category = ruleCategoryToTransactionCategory(rule.category);
  const classified = classifyTransaction({
    merchantName: args.merchantName,
    amount: -1,
  });
  return {
    category,
    classification: rule.shouldCountAsSpending
      ? ("spending" as const)
      : ("transfer" as const),
    needsReview: false,
    type: classified.type,
  };
}

export { listTransactionRulesForUser, createTransactionRuleForUser } from "@/lib/db/transaction-rules";
