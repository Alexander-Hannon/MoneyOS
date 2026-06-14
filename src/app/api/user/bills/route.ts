import { requireAuthUser } from "@/lib/auth/session";
import { listBillsForUser, replaceBillsForUser } from "@/lib/db/bills";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const bills = await listBillsForUser(auth.user.userId);
  return Response.json({ ok: true, bills });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as { bills?: unknown[] };
  if (!Array.isArray(body.bills)) {
    return Response.json({ error: "Expected bills array." }, { status: 400 });
  }

  await replaceBillsForUser(
    auth.user.userId,
    body.bills as Record<string, unknown>[],
  );
  const bills = await listBillsForUser(auth.user.userId);
  return Response.json({ ok: true, bills });
}
