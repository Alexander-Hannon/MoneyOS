import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const bills = await prisma.bill.findMany({ orderBy: { dueDay: "asc" } });
  return NextResponse.json(bills);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const amount = Number(body.amount);

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A name and a positive amount are required." },
      { status: 400 },
    );
  }

  const bill = await prisma.bill.create({
    data: {
      name,
      amount,
      dueDay: clampDay(Number(body.dueDay)),
      category: String(body.category ?? "General").trim() || "General",
      autopay: Boolean(body.autopay),
    },
  });

  return NextResponse.json(bill, { status: 201 });
}

function clampDay(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(28, Math.max(1, Math.round(value)));
}
