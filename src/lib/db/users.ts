import { randomUUID } from "node:crypto";
import type { AppMode } from "@/types/app-mode";
import { getPrisma } from "@/lib/db/prisma";

const BATCH_SIZE = 25;
const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

export type MigrationCounts = {
  bills: number;
  incomeSources: number;
  subscriptions: number;
  alerts: number;
  consentRecords: number;
  manualAccounts: number;
  spendingLater: number;
};

export type UserDataBundle = {
  appMode?: string;
  bills: unknown[];
  income: unknown[];
  subscriptions: unknown[];
  alerts: unknown[];
  manualAccounts?: unknown[];
  spendingLater?: unknown[];
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

async function runBatched<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
): Promise<number> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(handler));
  }
  return items.length;
}

/**
 * Import local user data into Postgres using batched upserts (no long interactive tx).
 * Re-running with the same local IDs updates records instead of duplicating them.
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
  const spendingLater = bundle.spendingLater ?? [];

  const billCount = await runBatched(bills, async (bill) => {
    const id = bill.id ? String(bill.id) : randomUUID();
    const data = mapBillFields(userId, bill);
    await prisma.bill.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  });

  const incomeCount = await runBatched(income, async (row) => {
    const id = row.id ? String(row.id) : randomUUID();
    const data = mapIncomeFields(userId, row);
    await prisma.incomeSource.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  });

  const subscriptionCount = await runBatched(subscriptions, async (row) => {
    const id = row.id ? String(row.id) : randomUUID();
    const data = mapSubscriptionFields(userId, row);
    await prisma.subscription.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  });

  const alertCount = await runBatched(alerts, async (row) => {
    const id = row.id ? String(row.id) : randomUUID();
    const data = mapAlertFields(userId, row);
    await prisma.moneyAlert.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  });

  const manualAccountCount = await runBatched(manualAccounts, async (row) => {
    const id = row.id ? String(row.id) : randomUUID();
    const data = mapManualAccountFields(userId, row);
    await prisma.account.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  });

  await prisma.$transaction(async (tx) => {
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
    bills: billCount,
    incomeSources: incomeCount,
    subscriptions: subscriptionCount,
    alerts: alertCount,
    consentRecords: 0,
    manualAccounts: manualAccountCount,
    spendingLater: spendingLater.length,
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
    spendingLater: [],
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
