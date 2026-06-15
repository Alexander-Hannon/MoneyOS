import { requireAuthUser } from "@/lib/auth/session";
import {
  createTransactionRuleForUser,
  listTransactionRulesForUser,
} from "@/lib/db/transaction-rules";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const rules = await listTransactionRulesForUser(auth.user.userId);
  return Response.json({ ok: true, rules });
}

export async function POST(request: Request) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  try {
    const body = await request.json();
    const merchantPattern = String(body?.merchantPattern ?? "").trim();
    const category = String(body?.category ?? "").trim();
    const shouldCountAsSpending = Boolean(body?.shouldCountAsSpending ?? true);

    if (!merchantPattern || !category) {
      return Response.json(
        { error: "merchantPattern and category are required." },
        { status: 400 },
      );
    }

    const rule = await createTransactionRuleForUser({
      userId: auth.user.userId,
      merchantPattern,
      category,
      shouldCountAsSpending,
      confidenceSource: "user_approved",
    });

    return Response.json({ ok: true, rule });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save transaction rule.",
      },
      { status: 500 },
    );
  }
}
