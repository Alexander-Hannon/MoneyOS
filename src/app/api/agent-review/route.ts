import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMoneyAgent, type FinanceSnapshot } from "@/lib/finance";

async function loadSnapshot(): Promise<FinanceSnapshot> {
  const [bills, income, subscriptions] = await Promise.all([
    prisma.bill.findMany(),
    prisma.income.findMany(),
    prisma.subscription.findMany(),
  ]);
  return { bills, income, subscriptions };
}

export async function GET() {
  const latest = await prisma.agentReview.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(latest);
}

export async function POST() {
  const snapshot = await loadSnapshot();
  const review = runMoneyAgent(snapshot);

  const saved = await prisma.agentReview.create({
    data: {
      healthScore: review.healthScore,
      monthlyIncome: review.monthlyIncome,
      monthlyOutflow: review.monthlyOutflow,
      netCashflow: review.netCashflow,
      summary: review.summary,
      recommendations: JSON.stringify(review.recommendations),
    },
  });

  return NextResponse.json(
    { ...review, id: saved.id, createdAt: saved.createdAt },
    { status: 201 },
  );
}
