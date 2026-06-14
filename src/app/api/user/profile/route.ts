import { requireAuthUser } from "@/lib/auth/session";
import { getUserProfile, updateUserProfile } from "@/lib/db/users";
import type { AppMode } from "@/types/app-mode";

function parseAppMode(value: unknown): AppMode | undefined {
  if (
    value === "demo" ||
    value === "local_user" ||
    value === "plaid_sandbox" ||
    value === "future_plaid_live"
  ) {
    return value;
  }
  return undefined;
}

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const profile = await getUserProfile(auth.user.userId);
  if (!profile) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  return Response.json({
    ok: true,
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      onboardingCompleted: profile.onboardingCompleted,
      appMode: profile.appMode,
      dataSourcePreference: profile.dataSourcePreference,
      migrationCompletedAt: profile.migrationCompletedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as Record<string, unknown>;

  const profile = await updateUserProfile(auth.user.userId, {
    onboardingCompleted:
      body.onboardingCompleted === undefined
        ? undefined
        : Boolean(body.onboardingCompleted),
    appMode: parseAppMode(body.appMode),
    dataSourcePreference:
      body.dataSourcePreference === undefined
        ? undefined
        : body.dataSourcePreference
          ? String(body.dataSourcePreference)
          : null,
  });

  return Response.json({
    ok: true,
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      onboardingCompleted: profile.onboardingCompleted,
      appMode: profile.appMode,
      dataSourcePreference: profile.dataSourcePreference,
    },
  });
}
