import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.agentReview.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.income.deleteMany();
  await prisma.bill.deleteMany();

  await prisma.income.createMany({
    data: [
      { source: "Salary", amount: 5200, frequency: "monthly" },
      { source: "Freelance", amount: 600, frequency: "monthly" },
    ],
  });

  await prisma.bill.createMany({
    data: [
      { name: "Rent", amount: 1850, dueDay: 1, category: "Housing", autopay: false },
      { name: "Electricity", amount: 120, dueDay: 12, category: "Utilities", autopay: true },
      { name: "Internet", amount: 70, dueDay: 8, category: "Utilities", autopay: true },
      { name: "Car insurance", amount: 145, dueDay: 3, category: "Insurance", autopay: false },
    ],
  });

  await prisma.subscription.createMany({
    data: [
      { name: "Netflix", amount: 15.49, billingCycle: "monthly", category: "Entertainment" },
      { name: "Spotify", amount: 11.99, billingCycle: "monthly", category: "Entertainment" },
      { name: "Gym", amount: 39, billingCycle: "monthly", category: "Health" },
      { name: "Cloud storage", amount: 99, billingCycle: "yearly", category: "Productivity" },
    ],
  });

  const counts = {
    income: await prisma.income.count(),
    bills: await prisma.bill.count(),
    subscriptions: await prisma.subscription.count(),
  };
  console.log("Seeded MoneyOS:", counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
