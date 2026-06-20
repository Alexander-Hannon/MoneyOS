import { getPrisma } from "@/lib/db/prisma";
import type { PlannedExpense } from "@/types/money";

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapPlannedExpenseFields(
  userId: string,
  row: Record<string, unknown>,
) {
  return {
    userId,
    name: String(row.name ?? row.title ?? "Planned expense"),
    title: row.title ? String(row.title) : null,
    amount: row.amount == null ? null : Number(row.amount),
    targetDate: parseDate(row.targetDate),
    category: String(row.category ?? "General"),
    status: String(row.status ?? "planned"),
    priority: row.priority ? String(row.priority) : null,
    notes: row.notes ? String(row.notes) : null,
    fundingSource: row.fundingSource ? String(row.fundingSource) : null,
    reminderDate: parseDate(row.reminderDate),
  };
}

function toDomainPlannedExpense(row: {
  id: string;
  name: string;
  title: string | null;
  amount: number | null;
  targetDate: Date | null;
  category: string;
  status: string;
  priority: string | null;
  notes: string | null;
  fundingSource: string | null;
  reminderDate: Date | null;
}): PlannedExpense {
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? undefined,
    amount: row.amount,
    targetDate: row.targetDate?.toISOString().slice(0, 10),
    category: row.category,
    status: row.status as PlannedExpense["status"],
    priority: (row.priority as PlannedExpense["priority"]) ?? undefined,
    notes: row.notes ?? undefined,
    fundingSource: row.fundingSource ?? undefined,
    reminderDate: row.reminderDate?.toISOString().slice(0, 10),
  };
}

export async function listPlannedExpensesForUser(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return [];
  const rows = await prisma.plannedExpense.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toDomainPlannedExpense);
}

export async function upsertPlannedExpensesForUser(
  userId: string,
  items: Record<string, unknown>[],
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database is not configured.");

  let created = 0;
  for (const row of items) {
    const id = row.id ? String(row.id) : undefined;
    const data = mapPlannedExpenseFields(userId, row);
    if (id) {
      await prisma.plannedExpense.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    } else {
      await prisma.plannedExpense.create({ data });
    }
    created += 1;
  }
  return created;
}
