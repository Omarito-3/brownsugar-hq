import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const entries = await prisma.salesEntry.findMany({
    include: { currencyAmounts: { select: { id: true } } },
  });

  const missing = entries.filter((e) => e.currencyAmounts.length === 0);

  for (const entry of missing) {
    await prisma.salesCurrencyAmount.create({
      data: {
        salesEntryId: entry.id,
        currencyCode: "ILS",
        amountOriginal: entry.totalIls,
        amountIls: entry.totalIls,
      },
    });
  }

  console.log(
    JSON.stringify({ totalEntries: entries.length, backfilled: missing.length })
  );
}

main().finally(() => prisma.$disconnect());
