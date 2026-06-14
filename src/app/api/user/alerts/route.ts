import { requireAuthUser } from "@/lib/auth/session";
import { listAlertsForUser, replaceAlertsForUser } from "@/lib/db/alerts";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const alerts = await listAlertsForUser(auth.user.userId);
  return Response.json({ ok: true, alerts });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as { alerts?: unknown[] };
  if (!Array.isArray(body.alerts)) {
    return Response.json({ error: "Expected alerts array." }, { status: 400 });
  }

  await replaceAlertsForUser(
    auth.user.userId,
    body.alerts as Record<string, unknown>[],
  );
  const alerts = await listAlertsForUser(auth.user.userId);
  return Response.json({ ok: true, alerts });
}
