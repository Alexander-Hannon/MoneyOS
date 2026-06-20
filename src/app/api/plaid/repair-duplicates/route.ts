import { requireAuthUser } from "@/lib/auth/session";
import { isAllowedLiveUserEmail } from "@/lib/plaid/live-mode";
import {
  dryRunDuplicateRepair,
  executeDuplicateRepair,
} from "@/lib/plaid/duplicate-repair";

// GET /api/plaid/repair-duplicates — dry-run duplicate detection
export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }
  if (!isAllowedLiveUserEmail(auth.user.email)) {
    return Response.json(
      {
        ok: false,
        errorCode: "owner_only",
        message: "Duplicate repair is limited to the authorized live Plaid owner.",
      },
      { status: 403 },
    );
  }

  const dryRun = await dryRunDuplicateRepair(auth.user.userId);

  return Response.json({
    ok: true,
    hasDuplicates:
      dryRun.duplicateInstitutions.length > 0 ||
      dryRun.duplicateAccounts.length > 0,
    dryRun,
  });
}

// POST /api/plaid/repair-duplicates — disconnect duplicate items after confirmation
export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }
  if (!isAllowedLiveUserEmail(auth.user.email)) {
    return Response.json(
      {
        ok: false,
        errorCode: "owner_only",
        message: "Duplicate repair is limited to the authorized live Plaid owner.",
      },
      { status: 403 },
    );
  }

  let body: {
    confirmed?: boolean;
    deleteHistoryForDisconnected?: boolean;
    deleteHistoryConfirmed?: boolean;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!body.confirmed) {
    return Response.json(
      {
        ok: false,
        errorCode: "confirmation_required",
        message: "Explicit confirmation is required before repairing duplicates.",
      },
      { status: 400 },
    );
  }

  if (body.deleteHistoryForDisconnected && !body.deleteHistoryConfirmed) {
    return Response.json(
      {
        ok: false,
        errorCode: "destructive_confirmation_required",
        message:
          "Deleting duplicate historical data requires a second explicit confirmation.",
      },
      { status: 400 },
    );
  }

  const result = await executeDuplicateRepair({
    userId: auth.user.userId,
    deleteHistoryForDisconnected: Boolean(
      body.deleteHistoryForDisconnected && body.deleteHistoryConfirmed,
    ),
  });

  return Response.json({
    ok: true,
    disconnectedItemIds: result.disconnectedItemIds,
    dryRun: result.dryRun,
    message:
      result.disconnectedItemIds.length > 0
        ? `Disconnected ${result.disconnectedItemIds.length} duplicate live connection${result.disconnectedItemIds.length === 1 ? "" : "s"}. Transaction history was preserved unless you chose to delete it.`
        : "No duplicate live connections required repair.",
  });
}
