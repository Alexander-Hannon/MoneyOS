import { requireAuthUser } from "@/lib/auth/session";
import {
  listSubscriptionsForUser,
  replaceSubscriptionsForUser,
} from "@/lib/db/subscriptions";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const subscriptions = await listSubscriptionsForUser(auth.user.userId);
  return Response.json({ ok: true, subscriptions });
}

export async function PUT(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const body = (await request.json()) as { subscriptions?: unknown[] };
  if (!Array.isArray(body.subscriptions)) {
    return Response.json(
      { error: "Expected subscriptions array." },
      { status: 400 },
    );
  }

  await replaceSubscriptionsForUser(
    auth.user.userId,
    body.subscriptions as Record<string, unknown>[],
  );
  const subscriptions = await listSubscriptionsForUser(auth.user.userId);
  return Response.json({ ok: true, subscriptions });
}
