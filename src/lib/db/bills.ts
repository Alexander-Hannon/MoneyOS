import { getPrisma } from "@/lib/db/prisma";

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
      await tx.bill.create({
        data: {
          id: bill.id ? String(bill.id) : undefined,
          userId,
          name: String(bill.name ?? "Bill"),
          amount: bill.amount == null ? null : Number(bill.amount),
          amountType: String(bill.amountType ?? "fixed"),
          dueDate: bill.dueDate ? new Date(String(bill.dueDate)) : null,
          frequency: String(bill.frequency ?? "monthly"),
          autopay: Boolean(bill.autopay),
          paidFrom: bill.paidFrom ? String(bill.paidFrom) : null,
          status: String(bill.status ?? "unpaid"),
          notes: bill.notes ? String(bill.notes) : null,
        },
      });
    }
  });
}
