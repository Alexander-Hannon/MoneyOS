import { getPrisma } from "@/lib/db/prisma";

export const LIVE_BALANCE_REFRESH_LIMIT = 2;
export const BALANCE_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

export type BalanceRefreshQuota = {
  limit: number;
  used: number;
  remaining: number;
  nextEligibleAt: string | null;
  windowStartedAt: string | null;
};

export async function getBalanceRefreshQuota(
  userId: string,
): Promise<BalanceRefreshQuota> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      limit: LIVE_BALANCE_REFRESH_LIMIT,
      used: 0,
      remaining: LIVE_BALANCE_REFRESH_LIMIT,
      nextEligibleAt: null,
      windowStartedAt: null,
    };
  }

  const since = new Date(Date.now() - BALANCE_REFRESH_WINDOW_MS);
  const successes = await prisma.balanceRefreshEvent.findMany({
    where: {
      userId,
      status: "success",
      successfulAt: { gte: since },
    },
    orderBy: { successfulAt: "asc" },
    select: { successfulAt: true },
  });

  const used = successes.length;
  const remaining = Math.max(0, LIVE_BALANCE_REFRESH_LIMIT - used);
  const oldest = successes[0]?.successfulAt ?? null;

  let nextEligibleAt: string | null = null;
  if (remaining <= 0 && oldest) {
    nextEligibleAt = new Date(
      oldest.getTime() + BALANCE_REFRESH_WINDOW_MS,
    ).toISOString();
  }

  return {
    limit: LIVE_BALANCE_REFRESH_LIMIT,
    used,
    remaining,
    nextEligibleAt,
    windowStartedAt: oldest?.toISOString() ?? null,
  };
}

export async function recordBalanceRefreshAttempt(args: {
  userId: string;
  plaidItemId?: string | null;
  environment?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.balanceRefreshEvent.create({
    data: {
      userId: args.userId,
      plaidItemId: args.plaidItemId ?? null,
      environment: args.environment ?? "production",
      status: "pending",
    },
  });
}

export async function markBalanceRefreshSuccess(eventId: string) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.balanceRefreshEvent.update({
    where: { id: eventId },
    data: {
      status: "success",
      successfulAt: new Date(),
    },
  });
}

export async function markBalanceRefreshFailed(
  eventId: string,
  errorCode?: string,
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  return prisma.balanceRefreshEvent.update({
    where: { id: eventId },
    data: {
      status: "failed",
      errorCode: errorCode ?? null,
    },
  });
}
