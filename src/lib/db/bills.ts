import { getPrisma } from "@/lib/db/prisma";

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
}

export async function listBillsForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  return prisma.bill.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
  });
}

export async function replaceBillsForUser(
  userId: string,
  bills: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  await prisma.$transaction(async (tx) => {
    await tx.bill.deleteMany({ where: { userId } });
    for (const bill of bills) {
      const dueDate = parseDate(bill.dueDate);
      await tx.bill.create({
        data: {
          id: bill.id ? String(bill.id) : undefined,
          userId,
          name: String(bill.name ?? "Bill"),
          amount: bill.amount == null ? null : Number(bill.amount),
          amountType: String(bill.amountType ?? "fixed"),
          dueDate,
          dueDay: dueDate ? dueDate.getUTCDate() : null,
          frequency: String(bill.frequency ?? "monthly"),
          autopay: Boolean(bill.autopay),
          paidFrom: bill.paidFrom ? String(bill.paidFrom) : null,
          status: String(bill.status ?? "unpaid"),
          notes: bill.notes ? String(bill.notes) : null,
          lastPaidAt: parseDate(bill.lastPaidAt),
          scheduledForDate: parseDate(bill.scheduledForDate),
          paymentUrl: bill.paymentUrl ? String(bill.paymentUrl) : null,
          paymentMethod: bill.paymentMethod ? String(bill.paymentMethod) : null,
          paymentInstructions: bill.paymentInstructions
            ? String(bill.paymentInstructions)
            : null,
          payeeName: bill.payeeName ? String(bill.payeeName) : null,
          reminderDaysBeforeDue:
            bill.reminderDaysBeforeDue == null
              ? null
              : Number(bill.reminderDaysBeforeDue),
        },
      });
    }
  });
}
