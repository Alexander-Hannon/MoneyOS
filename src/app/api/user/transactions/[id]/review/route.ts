import { requireAuthUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { updateTransactionReviewForUser } from "@/lib/db/transaction-review";
import type { Bill, Subscription } from "@/types/money";
import type { TransactionReviewPayload } from "@/types/transaction-review";

function mapBillRow(row: {
  id: string;
  name: string;
  amount: number | null;
  amountType: string;
  dueDate: Date | null;
  frequency: string;
  autopay: boolean;
  paidFrom: string | null;
  status: string;
  notes: string | null;
}): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    amountType: row.amountType as Bill["amountType"],
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? "",
    frequency: row.frequency as Bill["frequency"],
    autopay: row.autopay,
    paidFrom: row.paidFrom ?? "",
    status: row.status as Bill["status"],
    notes: row.notes ?? undefined,
  };
}

function mapSubscriptionRow(row: {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  status: string;
  renewalDate: Date | null;
  notes: string | null;
}): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency as Subscription["frequency"],
    category: row.category,
    status: row.status as Subscription["status"],
    renewalDate: row.renewalDate?.toISOString().slice(0, 10),
    notes: row.notes ?? undefined,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!auth.ok) {
    return Response.json(auth.body, { status: auth.status });
  }

  const { id: transactionId } = await context.params;

  try {
    const body = (await request.json()) as TransactionReviewPayload;
    if (!body?.action) {
      return Response.json({ error: "action is required." }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return Response.json({ error: "Database is not configured." }, { status: 503 });
    }

    const existing = await prisma.moneyTransaction.findFirst({
      where: { id: transactionId, userId: auth.user.userId },
    });
    if (!existing) {
      return Response.json({ error: "Transaction not found." }, { status: 404 });
    }

    let bill: Bill | null = null;
    let subscription: Subscription | null = null;

    if (body.action === "link_bill" && body.linkedBillId) {
      const row = await prisma.bill.findFirst({
        where: { id: body.linkedBillId, userId: auth.user.userId },
      });
      if (!row) {
        return Response.json({ error: "Bill not found." }, { status: 404 });
      }
      bill = mapBillRow(row);
    }

    if (body.action === "link_subscription" && body.linkedSubscriptionId) {
      const row = await prisma.subscription.findFirst({
        where: { id: body.linkedSubscriptionId, userId: auth.user.userId },
      });
      if (!row) {
        return Response.json({ error: "Subscription not found." }, { status: 404 });
      }
      subscription = mapSubscriptionRow(row);
    }

    const merchantName =
      existing.merchantName ?? existing.description ?? "Transaction";

    const transaction = await updateTransactionReviewForUser({
      userId: auth.user.userId,
      transactionId,
      payload: body,
      bill,
      subscription,
      merchantName,
    });

    return Response.json({ ok: true, transaction });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save transaction review.",
      },
      { status: 500 },
    );
  }
}
