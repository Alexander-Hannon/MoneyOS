import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FREQUENCIES = ["weekly", "biweekly", "monthly", "yearly"];

export async function GET() {
  const income = await prisma.income.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(income);
}

export async function POST(request: Request) {
  const body = await request.json();
  const source = String(body.source ?? "").trim();
  const amount = Number(body.amount);

  if (!source || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A source and a positive amount are required." },
      { status: 400 },
    );
  }

  const frequency = FREQUENCIES.includes(body.frequency)
    ? body.frequency
    : "monthly";

  const income = await prisma.income.create({
    data: { source, amount, frequency },
  });

  return NextResponse.json(income, { status: 201 });
}
