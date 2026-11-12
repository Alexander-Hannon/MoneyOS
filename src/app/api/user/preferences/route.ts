import type { Prisma } from "@prisma/client";
import { requireAuthUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getOrCreateUserSettings } from "@/lib/db/users";
import { sanitizePreferences } from "@/lib/preferences";

// GET /api/user/preferences
export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) return Response.json(auth.body, { status: auth.status });
  const settings = await getOrCreateUserSettings(auth.user.userId);
  return Response.json({ ok: true, preferences: sanitizePreferences(settings.preferences) });
}

// PUT /api/user/preferences  { dismissedRecurringIds, dismissedActionIds }
export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) return Response.json(auth.body, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }
  const prisma = getPrisma();
  if (!prisma) return Response.json({ ok: false, message: "Database is not configured." }, { status: 503 });

  const preferences = sanitizePreferences(body);
  try {
    await getOrCreateUserSettings(auth.user.userId);
    await prisma.userSettings.update({
      where: { userId: auth.user.userId },
      data: { preferences: preferences as unknown as Prisma.InputJsonValue },
    });
    return Response.json({ ok: true, preferences });
  } catch {
    return Response.json({ ok: false, message: "Could not save preferences." }, { status: 500 });
  }
}
