import { randomUUID } from "node:crypto";
import type { AppMode } from "@/types/app-mode";
import { getPrisma } from "@/lib/db/prisma";
import {
  countBundleRecords,
  type DomainCounts,
  wouldWipeAccountData,
} from "@/lib/sync/account-data-utils";
import { saveWeeklyReviewForUser } from "@/lib/db/weekly-reviews";

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

export type MigrationCounts = {
  bills: number;
  incomeSources: number;
  subscriptions: number;
  alerts: number;
  consentRecords: number;
  manualAccounts: number;
  spendingLater: number;
  weeklyReviews: number;
  transactionRules: number;
  skippedDuplicates: number;
  reviewNeeded: number;
};

export type AccountDataSyncMeta = {
  source: "database" | "empty";
  updatedAt: string;
  lastAccountDataSyncAt: string | null;
  counts: DomainCounts;
};

export type UserDataBundle = {
  appMode?: string;
  bills: unknown[];
  income: unknown[];
  subscriptions: unknown[];
  alerts: unknown[];
  manualAccounts?: unknown[];
  spendingLater?: unknown[];
  weeklyReviews?: unknown[];
  consentHistory?: Array<Omit<import("@/types/user").ConsentRecord, "id" | "userId">>;
};

export async function upsertUserFromClerk(args: {
  clerkUserId: string;
  email: string | null;
  displayName: string | null;
}) {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("Database is not configured.");
  }

  return prisma.user.upsert({
    where: { clerkUserId: args.clerkUserId },
    create: {
      clerkUserId: args.clerkUserId,
      email: args.email,
      displayName: args.displayName,
    },
    update: {
      email: args.email,
      displayName: args.displayName,
    },
  });
}

export async function getUserByClerkId(clerkUserId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.user.findUnique({ where: { clerkUserId } });
}

export async function getUserProfile(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });
}

export async function updateUserProfile(
  userId: string,
  data: {
    onboardingCompleted?: boolean;
    appMode?: AppMode;
    dataSourcePreference?: string | null;
    migrationCompletedAt?: Date | null;
  },
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function getOrCreateUserSettings(userId: string) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  return prisma.userSettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function updateUserSettings(
  userId: string,
  data: {
    theme?: string;
    defaultMode?: string;
    aiProviderPreference?: string | null;
  },
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");
  await getOrCreateUserSettings(userId);
  return prisma.userSettings.update({
    where: { userId },
    data,
  });
}

/**
 * Import local user data into Postgres using batched upserts (no long interactive tx).
 * Re-running with the same local IDs updates records instead of duplicating them.
 * Fingerprints prevent obvious duplicates when IDs differ.
 */
export async function importUserDataBundle(
  userId: string,
  bundle: UserDataBundle,
): Promise<MigrationCounts> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const bills = bundle.bills as Record<string, unknown>[];
  const income = bundle.income as Record<string, unknown>[];
  const subscriptions = bundle.subscriptions as Record<string, unknown>[];
  const alerts = bundle.alerts as Record<string, unknown>[];
  const manualAccounts = (bundle.manualAccounts ?? []) as Record<string, unknown>[];
  const spendingLater = (bundle.spendingLater ?? []) as Record<string, unknown>[];
  const weeklyReviews = (bundle.weeklyReviews ?? []) as Record<string, unknown>[];

  const [existingBills, existingIncome, existingSubs, existingAlerts, existingAccounts, existingPlanned] =
    await Promise.all([
      prisma.bill.findMany({ where: { userId }, select: { id: true, name: true, amount: true, dueDate: true, frequency: true } }),
      prisma.incomeSource.findMany({ where: { userId }, select: { id: true, source: true, expectedAmount: true, frequency: true, nextDate: true } }),
      prisma.subscription.findMany({ where: { userId }, select: { id: true, name: true, amount: true, frequency: true, renewalDate: true } }),
      prisma.moneyAlert.findMany({ where: { userId }, select: { id: true, title: true, category: true, severity: true } }),
      prisma.account.findMany({ where: { userId, source: "manual" }, select: { id: true, name: true, institution: true, type: true, currentBalance: true } }),
      prisma.plannedExpense.findMany({ where: { userId }, select: { id: true, name: true, amount: true, targetDate: true, category: true } }),
    ]);

  const billFingerprints = new Set(existingBills.map((b) => billFingerprint(b)));
  const incomeFingerprints = new Set(existingIncome.map((i) => incomeFingerprint(i)));
  const subFingerprints = new Set(existingSubs.map((s) => subscriptionFingerprint(s)));
  const alertFingerprints = new Set(existingAlerts.map((a) => alertFingerprint(a)));
  const accountFingerprints = new Set(existingAccounts.map((a) => manualAccountFingerprint(a)));
  const plannedFingerprints = new Set(existingPlanned.map((p) => plannedExpenseFingerprint(p)));

  let skippedDuplicates = 0;
  let reviewNeeded = 0;

  let billCount = 0;
  for (const bill of bills) {
    const id = bill.id ? String(bill.id) : randomUUID();
    const fp = billFingerprintFromInput(bill);
    const existingById = existingBills.find((b) => b.id === id);
    if (!existingById && billFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapBillFields(userId, bill);
    await prisma.bill.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    billFingerprints.add(fp);
    billCount += 1;
  }

  let incomeCount = 0;
  for (const row of income) {
    const id = row.id ? String(row.id) : randomUUID();
    const fp = incomeFingerprintFromInput(row);
    const existingById = existingIncome.find((i) => i.id === id);
    if (!existingById && incomeFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapIncomeFields(userId, row);
    await prisma.incomeSource.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    incomeFingerprints.add(fp);
    incomeCount += 1;
  }

  let subscriptionCount = 0;
  for (const row of subscriptions) {
    const id = row.id ? String(row.id) : randomUUID();
    const fp = subscriptionFingerprintFromInput(row);
    const existingById = existingSubs.find((s) => s.id === id);
    if (!existingById && subFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapSubscriptionFields(userId, row);
    await prisma.subscription.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    subFingerprints.add(fp);
    subscriptionCount += 1;
  }

  let alertCount = 0;
  for (const row of alerts) {
    const id = row.id ? String(row.id) : randomUUID();
    const fp = alertFingerprintFromInput(row);
    const existingById = existingAlerts.find((a) => a.id === id);
    if (!existingById && alertFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapAlertFields(userId, row);
    await prisma.moneyAlert.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    alertFingerprints.add(fp);
    alertCount += 1;
  }

  let manualAccountCount = 0;
  for (const row of manualAccounts) {
    const id = row.id ? String(row.id) : randomUUID();
    const fp = manualAccountFingerprintFromInput(row);
    const existingById = existingAccounts.find((a) => a.id === id);
    if (!existingById && accountFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapManualAccountFields(userId, row);
    await prisma.account.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    accountFingerprints.add(fp);
    manualAccountCount += 1;
  }

  let spendingLaterCount = 0;
  for (const row of spendingLater) {
    const id = row.id ? String(row.id) : randomUUID();
    const fp = plannedExpenseFingerprintFromInput(row);
    const existingById = existingPlanned.find((p) => p.id === id);
    if (!existingById && plannedFingerprints.has(fp)) {
      skippedDuplicates += 1;
      continue;
    }
    const data = mapPlannedExpenseFields(userId, row);
    await prisma.plannedExpense.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    plannedFingerprints.add(fp);
    spendingLaterCount += 1;
  }

  let weeklyReviewCount = 0;
  for (const row of weeklyReviews) {
    if (!row.id || !row.weekStartDate) continue;
    await saveWeeklyReviewForUser(userId, row as never);
    weeklyReviewCount += 1;
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(bundle.appMode ? { appMode: String(bundle.appMode) } : {}),
      migrationCompletedAt: now,
      lastAccountDataSyncAt: now,
    },
  });

  if (skippedDuplicates > 0) {
    reviewNeeded = skippedDuplicates;
  }

  return {
    bills: billCount,
    incomeSources: incomeCount,
    subscriptions: subscriptionCount,
    alerts: alertCount,
    consentRecords: 0,
    manualAccounts: manualAccountCount,
    spendingLater: spendingLaterCount,
    weeklyReviews: weeklyReviewCount,
    transactionRules: 0,
    skippedDuplicates,
    reviewNeeded,
  };
}

/** Replace all user-owned manual records (used when explicitly replacing account data). */
export async function replaceUserDataBundle(
  userId: string,
  bundle: Omit<UserDataBundle, "consentHistory" | "spendingLater">,
): Promise<MigrationCounts> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const bills = bundle.bills as Record<string, unknown>[];
  const income = bundle.income as Record<string, unknown>[];
  const subscriptions = bundle.subscriptions as Record<string, unknown>[];
  const alerts = bundle.alerts as Record<string, unknown>[];
  const manualAccounts = (bundle.manualAccounts ?? []) as Record<string, unknown>[];

  await prisma.$transaction(async (tx) => {
    await tx.bill.deleteMany({ where: { userId } });
    await tx.incomeSource.deleteMany({ where: { userId } });
    await tx.subscription.deleteMany({ where: { userId } });
    await tx.moneyAlert.deleteMany({ where: { userId } });
    await tx.account.deleteMany({
      where: { userId, source: { not: "plaid_sandbox" } },
    });

    if (bills.length > 0) {
      await tx.bill.createMany({
        data: bills.map((bill) => ({
          id: bill.id ? String(bill.id) : randomUUID(),
          ...mapBillFields(userId, bill),
        })),
      });
    }
    if (income.length > 0) {
      await tx.incomeSource.createMany({
        data: income.map((row) => ({
          id: row.id ? String(row.id) : randomUUID(),
          ...mapIncomeFields(userId, row),
        })),
      });
    }
    if (subscriptions.length > 0) {
      await tx.subscription.createMany({
        data: subscriptions.map((row) => ({
          id: row.id ? String(row.id) : randomUUID(),
          ...mapSubscriptionFields(userId, row),
        })),
      });
    }
    if (alerts.length > 0) {
      await tx.moneyAlert.createMany({
        data: alerts.map((row) => ({
          id: row.id ? String(row.id) : randomUUID(),
          ...mapAlertFields(userId, row),
        })),
      });
    }
    if (manualAccounts.length > 0) {
      await tx.account.createMany({
        data: manualAccounts.map((row) => ({
          id: row.id ? String(row.id) : randomUUID(),
          ...mapManualAccountFields(userId, row),
        })),
      });
    }

    if (bundle.appMode) {
      await tx.user.update({
        where: { id: userId },
        data: {
          appMode: String(bundle.appMode),
          migrationCompletedAt: new Date(),
        },
      });
    }
  }, TX_OPTIONS);

  return {
    bills: bills.length,
    incomeSources: income.length,
    subscriptions: subscriptions.length,
    alerts: alerts.length,
    consentRecords: 0,
    manualAccounts: manualAccounts.length,
    spendingLater: 0,
    weeklyReviews: 0,
    transactionRules: 0,
    skippedDuplicates: 0,
    reviewNeeded: 0,
  };
}

function billFingerprint(b: {
  name: string;
  amount: number | null;
  dueDate: Date | null;
  frequency: string;
}): string {
  return `${b.name}|${b.amount ?? ""}|${b.dueDate?.toISOString().slice(0, 10) ?? ""}|${b.frequency}`.toLowerCase();
}

function billFingerprintFromInput(b: Record<string, unknown>): string {
  return `${b.name ?? ""}|${b.amount ?? ""}|${b.dueDate ?? ""}|${b.frequency ?? "monthly"}`.toLowerCase();
}

function incomeFingerprint(i: {
  source: string;
  expectedAmount: number | null;
  frequency: string;
  nextDate: Date | null;
}): string {
  return `${i.source}|${i.expectedAmount ?? ""}|${i.frequency}|${i.nextDate?.toISOString().slice(0, 10) ?? ""}`.toLowerCase();
}

function incomeFingerprintFromInput(row: Record<string, unknown>): string {
  return `${row.source ?? ""}|${row.expectedAmount ?? ""}|${row.frequency ?? "monthly"}|${row.nextDate ?? ""}`.toLowerCase();
}

function subscriptionFingerprint(s: {
  name: string;
  amount: number;
  frequency: string;
  renewalDate: Date | null;
}): string {
  return `${s.name}|${s.amount}|${s.frequency}|${s.renewalDate?.toISOString().slice(0, 10) ?? ""}`.toLowerCase();
}

function subscriptionFingerprintFromInput(row: Record<string, unknown>): string {
  return `${row.name ?? ""}|${row.amount ?? 0}|${row.frequency ?? "monthly"}|${row.renewalDate ?? ""}`.toLowerCase();
}

function alertFingerprint(a: {
  title: string;
  category: string;
  severity: string;
}): string {
  return `${a.title}|${a.category}|${a.severity}`.toLowerCase();
}

function alertFingerprintFromInput(row: Record<string, unknown>): string {
  return `${row.title ?? ""}|${row.category ?? ""}|${row.severity ?? "medium"}`.toLowerCase();
}

function manualAccountFingerprint(a: {
  name: string;
  institution: string;
  type: string;
  currentBalance: number | null;
}): string {
  return `${a.name}|${a.institution}|${a.type}|${a.currentBalance ?? 0}`.toLowerCase();
}

function manualAccountFingerprintFromInput(row: Record<string, unknown>): string {
  return `${row.name ?? ""}|${row.institution ?? ""}|${row.type ?? ""}|${row.balance ?? 0}`.toLowerCase();
}

function plannedExpenseFingerprint(p: {
  name: string;
  amount: number | null;
  targetDate: Date | null;
  category: string;
}): string {
  return `${p.name}|${p.amount ?? ""}|${p.targetDate?.toISOString().slice(0, 10) ?? ""}|${p.category}`.toLowerCase();
}

function plannedExpenseFingerprintFromInput(row: Record<string, unknown>): string {
  return `${row.name ?? row.title ?? ""}|${row.amount ?? ""}|${row.targetDate ?? ""}|${row.category ?? "General"}`.toLowerCase();
}

function mapPlannedExpenseFields(userId: string, row: Record<string, unknown>) {
  return {
    userId,
    name: String(row.name ?? row.title ?? "Planned expense"),
    title: row.title ? String(row.title) : null,
    amount: row.amount == null ? null : Number(row.amount),
    targetDate: parseDate(row.targetDate),
    category: String(row.category ?? "General"),
    status: String(row.status ?? "planned"),
    priority: row.priority ? String(row.priority) : null,
    notes: row.notes ? String(row.notes) : null,
    fundingSource: row.fundingSource ? String(row.fundingSource) : null,
    reminderDate: parseDate(row.reminderDate),
  };
}

export async function getAccountDomainCountsFromDb(
  userId: string,
): Promise<DomainCounts> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      bills: 0,
      income: 0,
      subscriptions: 0,
      alerts: 0,
      manualAccounts: 0,
      spendingLater: 0,
      weeklyReviews: 0,
    };
  }

  const counts = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      _count: {
        select: {
          bills: true,
          incomeSources: true,
          subscriptions: true,
          alerts: true,
          plannedExpenses: true,
          weeklyReviews: true,
        },
      },
    },
  });

  const manualAccounts = await prisma.account.count({
    where: { userId, source: "manual" },
  });

  return {
    bills: counts?._count.bills ?? 0,
    income: counts?._count.incomeSources ?? 0,
    subscriptions: counts?._count.subscriptions ?? 0,
    alerts: counts?._count.alerts ?? 0,
    manualAccounts,
    spendingLater: counts?._count.plannedExpenses ?? 0,
    weeklyReviews: counts?._count.weeklyReviews ?? 0,
  };
}

export async function recordAccountMigration(args: {
  userId: string;
  deviceFingerprint: string;
  beforeCounts: DomainCounts;
  afterCounts: DomainCounts;
  resultCounts: MigrationCounts;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.accountMigrationRecord.create({
    data: {
      userId: args.userId,
      deviceFingerprint: args.deviceFingerprint,
      beforeCounts: args.beforeCounts,
      afterCounts: args.afterCounts,
      resultCounts: args.resultCounts,
      skippedDuplicates: args.resultCounts.skippedDuplicates,
    },
  });
}

export async function syncAccountDataFromClient(
  userId: string,
  bundle: UserDataBundle,
  options?: { allowEmptyOverwrite?: boolean; source?: "local_mutation" | "explicit_push" },
): Promise<{ counts: MigrationCounts; updatedAt: string; lastAccountDataSyncAt: string }> {
  const existingCounts = await getAccountDomainCountsFromDb(userId);
  const incomingCounts = countBundleRecords({
    bills: bundle.bills as never[],
    income: bundle.income as never[],
    subscriptions: bundle.subscriptions as never[],
    alerts: bundle.alerts as never[],
    manualAccounts: bundle.manualAccounts as never[],
    spendingLater: bundle.spendingLater as never[],
  });

  if (
    wouldWipeAccountData({
      existingCounts,
      incomingCounts,
    }) &&
    !options?.allowEmptyOverwrite
  ) {
    throw new Error(
      "Refusing to overwrite account-backed data with empty local state.",
    );
  }

  const counts = await importUserDataBundle(userId, bundle);
  const meta = await loadAccountDataWithMeta(userId);
  return {
    counts,
    updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    lastAccountDataSyncAt:
      meta?.lastAccountDataSyncAt ?? new Date().toISOString(),
  };
}

export async function loadAccountDataWithMeta(
  userId: string,
): Promise<(ReturnType<typeof loadUserDataBundle> extends Promise<infer T> ? T : never) & AccountDataSyncMeta | null> {
  const bundle = await loadUserDataBundle(userId);
  if (!bundle) return null;

  const prisma = getPrisma();
  if (!prisma) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastAccountDataSyncAt: true,
      updatedAt: true,
      _count: {
        select: {
          bills: true,
          incomeSources: true,
          subscriptions: true,
          alerts: true,
          plannedExpenses: true,
          weeklyReviews: true,
        },
      },
    },
  });

  const manualAccountCount = await prisma.account.count({
    where: { userId, source: "manual" },
  });

  const recordTotal =
    (user?._count.bills ?? 0) +
    (user?._count.incomeSources ?? 0) +
    (user?._count.subscriptions ?? 0) +
    (user?._count.alerts ?? 0) +
    manualAccountCount +
    (user?._count.plannedExpenses ?? 0) +
    (user?._count.weeklyReviews ?? 0);

  const timestamps = await Promise.all([
    prisma.bill.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.incomeSource.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.subscription.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.moneyAlert.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.account.findFirst({ where: { userId, source: "manual" }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.plannedExpense.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  const maxUpdated = timestamps
    .map((t) => t?.updatedAt?.getTime() ?? 0)
    .reduce((a, b) => Math.max(a, b), user?.updatedAt.getTime() ?? 0);

  return {
    ...bundle,
    updatedAt: new Date(maxUpdated).toISOString(),
    lastAccountDataSyncAt: user?.lastAccountDataSyncAt?.toISOString() ?? null,
    source: recordTotal > 0 ? ("database" as const) : ("empty" as const),
    counts: {
      bills: user?._count.bills ?? 0,
      income: user?._count.incomeSources ?? 0,
      subscriptions: user?._count.subscriptions ?? 0,
      alerts: user?._count.alerts ?? 0,
      manualAccounts: manualAccountCount,
      spendingLater: user?._count.plannedExpenses ?? 0,
      weeklyReviews: user?._count.weeklyReviews ?? 0,
    },
  };
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapBillFields(userId: string, bill: Record<string, unknown>) {
  return {
    userId,
    name: String(bill.name ?? "Bill"),
    amount: bill.amount == null ? null : Number(bill.amount),
    amountType: String(bill.amountType ?? "fixed"),
    dueDate: parseDate(bill.dueDate),
    frequency: String(bill.frequency ?? "monthly"),
    autopay: Boolean(bill.autopay),
    paidFrom: bill.paidFrom ? String(bill.paidFrom) : null,
    status: String(bill.status ?? "unpaid"),
    notes: bill.notes ? String(bill.notes) : null,
  };
}

function mapIncomeFields(userId: string, income: Record<string, unknown>) {
  return {
    userId,
    source: String(income.source ?? "Income"),
    expectedAmount:
      income.expectedAmount == null ? null : Number(income.expectedAmount),
    amountType: String(income.amountType ?? "fixed"),
    frequency: String(income.frequency ?? "monthly"),
    reliability: String(income.reliability ?? "medium"),
    startDate: parseDate(income.startDate),
    nextDate: parseDate(income.nextDate),
    active: income.active !== false,
    notes: income.notes ? String(income.notes) : null,
  };
}

function mapSubscriptionFields(userId: string, sub: Record<string, unknown>) {
  return {
    userId,
    name: String(sub.name ?? "Subscription"),
    amount: Number(sub.amount) || 0,
    frequency: String(sub.frequency ?? "monthly"),
    category: String(sub.category ?? "General"),
    status: String(sub.status ?? "keep"),
    renewalDate: parseDate(sub.renewalDate),
    notes: sub.notes ? String(sub.notes) : null,
  };
}

function mapAlertFields(userId: string, alert: Record<string, unknown>) {
  return {
    userId,
    title: String(alert.title ?? "Alert"),
    description: String(alert.description ?? ""),
    severity: String(alert.severity ?? "medium"),
    category: String(alert.category ?? "review"),
    suggestedAction: alert.suggestedAction
      ? String(alert.suggestedAction)
      : null,
    reviewRequired: alert.reviewRequired !== false,
    status: String(alert.status ?? "active"),
  };
}

function mapManualAccountFields(userId: string, account: Record<string, unknown>) {
  return {
    userId,
    name: String(account.name ?? "Account"),
    institution: String(account.institution ?? "Manual"),
    type: String(account.type ?? "other"),
    subtype: null,
    mask: null,
    currentBalance:
      account.balance == null ? null : Number(account.balance),
    availableBalance:
      account.availableBalance == null
        ? null
        : Number(account.availableBalance),
    source: "manual",
    connectionStatus: "not_connected",
  };
}

export async function loadUserDataBundle(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bills: true,
      incomeSources: true,
      subscriptions: true,
      alerts: true,
      accounts: {
        where: { source: "manual" },
      },
      plannedExpenses: true,
    },
  });
  if (!user) return null;

  return {
    appMode: user.appMode,
    bills: user.bills.map(toDomainBill),
    income: user.incomeSources.map(toDomainIncome),
    subscriptions: user.subscriptions.map(toDomainSubscription),
    alerts: user.alerts.map(toDomainAlert),
    manualAccounts: user.accounts.map(toDomainManualAccount),
    spendingLater: user.plannedExpenses.map(toDomainPlannedExpense),
  };
}

function toDomainPlannedExpense(p: {
  id: string;
  name: string;
  title: string | null;
  amount: number | null;
  targetDate: Date | null;
  category: string;
  status: string;
  priority: string | null;
  notes: string | null;
  fundingSource: string | null;
  reminderDate: Date | null;
}) {
  return {
    id: p.id,
    name: p.name,
    title: p.title ?? undefined,
    amount: p.amount,
    targetDate: p.targetDate?.toISOString().slice(0, 10),
    category: p.category,
    status: p.status,
    priority: p.priority ?? undefined,
    notes: p.notes ?? undefined,
    fundingSource: p.fundingSource ?? undefined,
    reminderDate: p.reminderDate?.toISOString().slice(0, 10),
  };
}

function toDomainBill(b: {
  id: string;
  name: string;
  amount: number | null;
  amountType: string;
  dueDate: Date | null;
  frequency: string;
  autopay: boolean;
  paidFrom: string | null;
  status: string;
  notes: string | null;
}) {
  return {
    id: b.id,
    name: b.name,
    amount: b.amount,
    amountType: b.amountType,
    dueDate: b.dueDate?.toISOString().slice(0, 10) ?? "",
    frequency: b.frequency,
    autopay: b.autopay,
    paidFrom: b.paidFrom ?? "",
    status: b.status,
    notes: b.notes ?? undefined,
  };
}

function toDomainIncome(i: {
  id: string;
  source: string;
  expectedAmount: number | null;
  amountType: string;
  frequency: string;
  reliability: string;
  startDate: Date | null;
  nextDate: Date | null;
  active: boolean;
  notes: string | null;
}) {
  return {
    id: i.id,
    source: i.source,
    expectedAmount: i.expectedAmount,
    amountType: i.amountType,
    frequency: i.frequency,
    reliability: i.reliability,
    active: i.active,
    startDate: i.startDate?.toISOString().slice(0, 10),
    nextDate: i.nextDate?.toISOString().slice(0, 10),
    notes: i.notes ?? undefined,
  };
}

function toDomainSubscription(s: {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  status: string;
  renewalDate: Date | null;
  notes: string | null;
}) {
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    frequency: s.frequency,
    category: s.category,
    status: s.status,
    renewalDate: s.renewalDate?.toISOString().slice(0, 10),
    notes: s.notes ?? undefined,
  };
}

function toDomainAlert(a: {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  suggestedAction: string | null;
  reviewRequired: boolean;
  status: string;
}) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    category: a.category,
    suggestedAction: a.suggestedAction ?? "",
    reviewRequired: a.reviewRequired,
    status: a.status,
  };
}

function toDomainManualAccount(a: {
  id: string;
  name: string;
  institution: string;
  type: string;
  currentBalance: number | null;
  availableBalance: number | null;
}) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
    balance: a.currentBalance ?? 0,
    availableBalance: a.availableBalance ?? undefined,
    accessible: true,
    source: "manual" as const,
  };
}
