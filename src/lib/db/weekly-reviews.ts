import { getPrisma } from "@/lib/db/prisma";
import type { WeeklyReviewRecord } from "@/types/weekly-review";

export async function listWeeklyReviewsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  const rows = await prisma.weeklyReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 52,
  });
  return rows.map(toDomainWeeklyReview);
}

export async function saveWeeklyReviewForUser(
  userId: string,
  record: WeeklyReviewRecord,
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  const existing = await prisma.weeklyReview.findUnique({
    where: { id: record.id },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) {
    throw new Error("Weekly review belongs to another account.");
  }

  return prisma.weeklyReview.upsert({
    where: { id: record.id },
    create: {
      id: record.id,
      userId,
      weekStartDate: record.weekStartDate,
      createdAt: new Date(record.createdAt),
      status: record.status,
      cashAvailable: record.cashAvailable,
      billsDue7: record.billsDue7,
      billsDue14: record.billsDue14,
      billsDue30: record.billsDue30,
      incomeExpected14: record.incomeExpected14,
      monthlyRecurring: record.monthlyRecurring,
      reviewItemCount: record.reviewItemCount,
      weeklyScore: record.weeklyScore,
      summary: record.summary,
      whatMattersMost: record.whatMattersMost,
      obligationsSnapshot: record.obligationsSnapshot,
      spendingSnapshot: record.spendingSnapshot,
      risks: record.risks,
      firstThreeActions: record.firstThreeActions,
      bestNextAction: record.bestNextAction,
      userNotes: record.userNotes ?? null,
      completedActions: record.completedActions ?? [],
      sourceMode: record.sourceMode,
      aiProvider: record.aiProvider,
      dataConfidence: record.dataConfidence,
      reminderDrafts: record.reminderDrafts ?? [],
    },
    update: {
      userNotes: record.userNotes ?? null,
      completedActions: record.completedActions ?? [],
    },
  });
}

function toDomainWeeklyReview(row: {
  id: string;
  weekStartDate: string;
  createdAt: Date;
  status: string;
  cashAvailable: number;
  billsDue7: number;
  billsDue14: number;
  billsDue30: number;
  incomeExpected14: number;
  monthlyRecurring: number;
  reviewItemCount: number;
  weeklyScore: number;
  summary: string;
  whatMattersMost: unknown;
  obligationsSnapshot: unknown;
  spendingSnapshot: unknown;
  risks: unknown;
  firstThreeActions: unknown;
  bestNextAction: string;
  userNotes: string | null;
  completedActions: unknown;
  sourceMode: string;
  aiProvider: string;
  dataConfidence: string;
  reminderDrafts: unknown;
}): WeeklyReviewRecord {
  return {
    id: row.id,
    weekStartDate: row.weekStartDate,
    createdAt: row.createdAt.toISOString(),
    status: row.status as WeeklyReviewRecord["status"],
    cashAvailable: row.cashAvailable,
    billsDue7: row.billsDue7,
    billsDue14: row.billsDue14,
    billsDue30: row.billsDue30,
    incomeExpected14: row.incomeExpected14,
    monthlyRecurring: row.monthlyRecurring,
    reviewItemCount: row.reviewItemCount,
    weeklyScore: row.weeklyScore,
    summary: row.summary,
    whatMattersMost: Array.isArray(row.whatMattersMost)
      ? (row.whatMattersMost as string[])
      : [],
    obligationsSnapshot: Array.isArray(row.obligationsSnapshot)
      ? (row.obligationsSnapshot as string[])
      : [],
    spendingSnapshot: Array.isArray(row.spendingSnapshot)
      ? (row.spendingSnapshot as string[])
      : [],
    risks: Array.isArray(row.risks) ? (row.risks as string[]) : [],
    firstThreeActions: Array.isArray(row.firstThreeActions)
      ? (row.firstThreeActions as string[])
      : [],
    bestNextAction: row.bestNextAction,
    userNotes: row.userNotes ?? undefined,
    completedActions: Array.isArray(row.completedActions)
      ? (row.completedActions as string[])
      : undefined,
    sourceMode: row.sourceMode as WeeklyReviewRecord["sourceMode"],
    aiProvider: row.aiProvider as WeeklyReviewRecord["aiProvider"],
    dataConfidence: row.dataConfidence as WeeklyReviewRecord["dataConfidence"],
    reminderDrafts: Array.isArray(row.reminderDrafts)
      ? (row.reminderDrafts as WeeklyReviewRecord["reminderDrafts"])
      : undefined,
  };
}
