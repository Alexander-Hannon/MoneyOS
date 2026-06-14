import { requireAuthUser } from "@/lib/auth/session";
import { listIncomeForUser, replaceIncomeForUser } from "@/lib/db/income";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const income = await listIncomeForUser(auth.user.userId);
  return Response.json({ ok: true, income });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as { income?: unknown[] };
  if (!Array.isArray(body.income)) {
    return Response.json({ error: "Expected income array." }, { status: 400 });
  }

  await replaceIncomeForUser(
    auth.user.userId,
    body.income as Record<string, unknown>[],
  );
  const income = await listIncomeForUser(auth.user.userId);
  return Response.json({ ok: true, income });
}
