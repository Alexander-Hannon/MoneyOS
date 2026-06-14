import { requireAuthUser } from "@/lib/auth/session";
import { getOrCreateUserSettings, updateUserSettings } from "@/lib/db/users";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const settings = await getOrCreateUserSettings(auth.user.userId);
  return Response.json({
    ok: true,
    settings: {
      theme: settings.theme,
      defaultMode: settings.defaultMode,
      aiProviderPreference: settings.aiProviderPreference,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const settings = await updateUserSettings(auth.user.userId, {
    theme: body.theme ? String(body.theme) : undefined,
    defaultMode: body.defaultMode ? String(body.defaultMode) : undefined,
    aiProviderPreference:
      body.aiProviderPreference === undefined
        ? undefined
        : body.aiProviderPreference
          ? String(body.aiProviderPreference)
          : null,
  });

  return Response.json({
    ok: true,
    settings: {
      theme: settings.theme,
      defaultMode: settings.defaultMode,
      aiProviderPreference: settings.aiProviderPreference,
    },
  });
}
