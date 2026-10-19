import type { Prisma } from "@prisma/client";
import { requireAuthUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { getOrCreateUserSettings } from "@/lib/db/users";
import { sanitizePlanSettings } from "@/lib/spending-plan";

// GET /api/user/spending-plan — the signed-in user's plan settings
export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }
  const settings = await getOrCreateUserSettings(auth.user.userId);
  return Response.json({
    ok: true,
    saved: settings.spendingPlan != null,
    plan: sanitizePlanSettings(settings.spendingPlan),
  });
}

// PUT /api/user/spending-plan  { savingsTarget, categoryCaps }
export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const plan = sanitizePlanSettings(body);
  const prisma = getPrisma();
  if (!prisma) {
    return Response.json({ ok: false, message: "Database is not configured." }, { status: 503 });
  }

  try {
    await getOrCreateUserSettings(auth.user.userId);
    await prisma.userSettings.update({
      where: { userId: auth.user.userId },
      data: { spendingPlan: plan as unknown as Prisma.InputJsonValue },
    });
    return Response.json({ ok: true, plan });
  } catch {
    return Response.json({ ok: false, message: "Could not save the spending plan." }, { status: 500 });
  }
}
