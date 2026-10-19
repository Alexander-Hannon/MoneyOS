import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { validateLivePlaidAccess } from "@/lib/plaid/live-mode";
import { listBalanceSnapshotsForUser, type SnapshotSource } from "@/lib/db/balance-snapshots";

const MAX_DAYS = 730;

// GET /api/user/balance-history?environment=production|sandbox|none&includeManual=true&days=365
// Returns recorded snapshots only, with display-safe account fields.
// Sandbox history is never combined with Personal Live or manual history.
export async function GET(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const environment = url.searchParams.get("environment");
  const includeManual = url.searchParams.get("includeManual") === "true";
  if (environment !== "production" && environment !== "sandbox" && environment !== "none") {
    return NextResponse.json(
      { ok: false, errorCode: "invalid_environment", message: "environment must be production, sandbox, or none." },
      { status: 400 },
    );
  }

  if (environment === "production") {
    const live = validateLivePlaidAccess({ user: auth.user, targetEnvironment: "production" });
    if (!live.ok) {
      return NextResponse.json(
        { ok: false, errorCode: live.errorCode, message: live.message },
        { status: 403 },
      );
    }
  }

  const daysParam = Number(url.searchParams.get("days") ?? 365);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(1, Math.round(daysParam)), MAX_DAYS) : 365;
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  try {
    const sources: SnapshotSource[] =
      environment === "sandbox"
        ? ["plaid_sandbox"]
        : environment === "production"
          ? includeManual
            ? ["plaid_live", "manual"]
            : ["plaid_live"]
          : ["manual"];
    const { accounts, snapshots } = await listBalanceSnapshotsForUser({
      userId: auth.user.userId,
      sources,
      sinceDate: since,
    });
    return NextResponse.json({
      ok: true,
      environment,
      accounts,
      sources,
      snapshots: snapshots.map((s) => ({
        accountId: s.accountId,
        source: s.source,
        accountType: s.accountType,
        snapshotDate: s.snapshotDate,
        currentBalance: s.currentBalance,
        availableBalance: s.availableBalance,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "history_unavailable", message: "Balance history could not be loaded." },
      { status: 500 },
    );
  }
}
