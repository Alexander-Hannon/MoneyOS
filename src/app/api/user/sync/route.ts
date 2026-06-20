import { requireAuthUser } from "@/lib/auth/session";
import {
  loadAccountDataWithMeta,
  syncAccountDataFromClient,
  type UserDataBundle,
} from "@/lib/db/users";

// GET /api/user/sync — load canonical account-backed MoneyOS data
export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const payload = await loadAccountDataWithMeta(auth.user.userId);
  if (!payload) {
    return Response.json({
      ok: true,
      source: "empty" as const,
      updatedAt: null,
      lastAccountDataSyncAt: null,
      data: null,
      counts: {
        bills: 0,
        income: 0,
        subscriptions: 0,
        alerts: 0,
        manualAccounts: 0,
        spendingLater: 0,
        weeklyReviews: 0,
      },
    });
  }

  const { updatedAt, lastAccountDataSyncAt, counts, source, ...data } = payload;

  return Response.json({
    ok: true,
    source,
    updatedAt,
    lastAccountDataSyncAt,
    data,
    counts,
  });
}

// POST /api/user/sync — upsert local device data into signed-in account
export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  let body: {
    data?: UserDataBundle;
    source?: "local_mutation" | "explicit_push";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!body.data) {
    return Response.json(
      { ok: false, message: "Missing data payload." },
      { status: 400 },
    );
  }

  try {
    const result = await syncAccountDataFromClient(auth.user.userId, body.data, {
      source: body.source,
    });
    return Response.json({
      ok: true,
      source: "database" as const,
      updatedAt: result.updatedAt,
      lastAccountDataSyncAt: result.lastAccountDataSyncAt,
      counts: {
        bills: result.counts.bills,
        income: result.counts.incomeSources,
        subscriptions: result.counts.subscriptions,
        alerts: result.counts.alerts,
        manualAccounts: result.counts.manualAccounts,
        spendingLater: result.counts.spendingLater,
        weeklyReviews: result.counts.weeklyReviews,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sync account data.";
    const status = message.includes("empty local state") ? 409 : 500;
    return Response.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
