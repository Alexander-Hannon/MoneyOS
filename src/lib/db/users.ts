import type { AppMode } from "@/types/app-mode";
import { getPrisma } from "@/lib/db/prisma";

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

export async function importUserDataBundle(
  userId: string,
  bundle: {
    appMode?: string;
    bills: unknown[];
    income: unknown[];
    subscriptions: unknown[];
    alerts: unknown[];
  },
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.bill.deleteMany({ where: { userId } });
    await tx.incomeSource.deleteMany({ where: { userId } });
    await tx.subscription.deleteMany({ where: { userId } });
    await tx.moneyAlert.deleteMany({ where: { userId } });

    for (const bill of bundle.bills as Record<string, unknown>[]) {
      await tx.bill.create({
        data: mapBillInput(userId, bill),
      });
    }
    for (const income of bundle.income as Record<string, unknown>[]) {
      await tx.incomeSource.create({
        data: mapIncomeInput(userId, income),
      });
    }
    for (const sub of bundle.subscriptions as Record<string, unknown>[]) {
      await tx.subscription.create({
        data: mapSubscriptionInput(userId, sub),
      });
    }
    for (const alert of bundle.alerts as Record<string, unknown>[]) {
      await tx.moneyAlert.create({
        data: mapAlertInput(userId, alert),
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
  });
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapBillInput(userId: string, bill: Record<string, unknown>) {
  return {
    ...(bill.id ? { id: String(bill.id) } : {}),
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

function mapIncomeInput(userId: string, income: Record<string, unknown>) {
  return {
    ...(income.id ? { id: String(income.id) } : {}),
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

function mapSubscriptionInput(userId: string, sub: Record<string, unknown>) {
  return {
    ...(sub.id ? { id: String(sub.id) } : {}),
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

function mapAlertInput(userId: string, alert: Record<string, unknown>) {
  return {
    ...(alert.id ? { id: String(alert.id) } : {}),
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
    },
  });
  if (!user) return null;

  return {
    appMode: user.appMode,
    bills: user.bills.map(toDomainBill),
    income: user.incomeSources.map(toDomainIncome),
    subscriptions: user.subscriptions.map(toDomainSubscription),
    alerts: user.alerts.map(toDomainAlert),
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
