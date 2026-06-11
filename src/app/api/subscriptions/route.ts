import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CYCLES = ["weekly", "monthly", "yearly"];

export async function GET() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(subscriptions);
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

  const billingCycle = CYCLES.includes(body.billingCycle)
    ? body.billingCycle
    : "monthly";

  const subscription = await prisma.subscription.create({
    data: {
      name,
      amount,
      billingCycle,
      category: String(body.category ?? "Entertainment").trim() || "Entertainment",
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
