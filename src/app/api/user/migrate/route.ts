import { requireAuthUser } from "@/lib/auth/session";
import {
  importUserDataBundle,
  loadUserDataBundle,
  updateUserProfile,
} from "@/lib/db/users";
import { createConsentForUser } from "@/lib/db/consent";

type MigrationAction = "save_local" | "keep_local" | "use_account";

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as {
    action?: MigrationAction;
    data?: {
      appMode?: string;
      bills?: unknown[];
      income?: unknown[];
      subscriptions?: unknown[];
      alerts?: unknown[];
      consentHistory?: {
        consentType: string;
        acceptedAt: string;
        version: string;
        textSummary: string;
        dataScopes: string[];
        plaidProducts?: string[];
      }[];
    };
  };

  const action = body.action;
  if (!action || !["save_local", "keep_local", "use_account"].includes(action)) {
    return Response.json({ error: "Invalid migration action." }, { status: 400 });
  }

  if (action === "save_local") {
    if (!body.data) {
      return Response.json({ error: "Missing local data payload." }, { status: 400 });
    }

    await importUserDataBundle(auth.user.userId, {
      appMode: body.data.appMode,
      bills: body.data.bills ?? [],
      income: body.data.income ?? [],
      subscriptions: body.data.subscriptions ?? [],
      alerts: body.data.alerts ?? [],
    });

    for (const consent of body.data.consentHistory ?? []) {
      await createConsentForUser(auth.user.userId, {
        consentType: consent.consentType as "plaid_link",
        acceptedAt: consent.acceptedAt,
        version: consent.version,
        textSummary: consent.textSummary,
        dataScopes: consent.dataScopes,
        plaidProducts: consent.plaidProducts,
      });
    }

    await updateUserProfile(auth.user.userId, {
      migrationCompletedAt: new Date(),
    });

    return Response.json({ ok: true, action, migrated: true });
  }

  if (action === "use_account") {
    const accountData = await loadUserDataBundle(auth.user.userId);
    await updateUserProfile(auth.user.userId, {
      migrationCompletedAt: new Date(),
    });
    return Response.json({ ok: true, action, accountData });
  }

  await updateUserProfile(auth.user.userId, {
    migrationCompletedAt: new Date(),
  });

  return Response.json({ ok: true, action, migrated: false });
}
