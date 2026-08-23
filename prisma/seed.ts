import "dotenv/config";
import { PrismaClient, ProductCategory } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const branchSeeds = [
    { name: "Batn al-Hawa", location: "Batn al-Hawa, Jerusalem" },
    { name: "Icon Mall", location: "Icon Mall, Ramallah" },
    { name: "Birzeit University", location: "Birzeit University Campus" },
  ];

  const branches = [];
  for (const b of branchSeeds) {
    const existing = await prisma.branch.findFirst({ where: { name: b.name } });
    const branch = existing ?? (await prisma.branch.create({ data: b }));
    branches.push(branch);
  }

  const currencies = [
    { code: "ILS", rateToIls: "1.0000" },
    { code: "USD", rateToIls: "3.7000" },
    { code: "JOD", rateToIls: "5.2200" },
    { code: "EUR", rateToIls: "4.0000" },
  ];
  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { rateToIls: c.rateToIls },
      create: c,
    });
  }

  // Shared dev password for all seeded accounts — local/testing only.
  const seedPassword = "BrownSugar123!";
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  // MANAGER and STAFF share a branch on purpose: that makes it possible to see
  // the same branch's data under two different roles when checking scoping.
  const scopedBranch = branches.find((b) => b.name === "Batn al-Hawa") ?? branches[0];

  const userSeeds = [
    { name: "Owner", email: "owner@brownsugar.hq", role: "OWNER" as const, branchId: null },
    {
      name: "Branch Manager",
      email: "manager@brownsugar.hq",
      role: "MANAGER" as const,
      branchId: scopedBranch.id,
    },
    {
      name: "Staff Member",
      email: "staff@brownsugar.hq",
      role: "STAFF" as const,
      branchId: scopedBranch.id,
    },
  ];

  for (const u of userSeeds) {
    await prisma.user.upsert({
      where: { email: u.email },
      // Re-running the seed re-asserts role and branch, so an account that was
      // created before these fields existed gets corrected rather than skipped.
      update: { role: u.role, branchId: u.branchId },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        branchId: u.branchId,
      },
    });
  }

  const products = [
    { name: "Brown Sugar Boba Milk", nameAr: "حليب البوبا بالسكر البني", category: ProductCategory.BUBBLE_TEA, basePriceIls: "22.00", costIls: "7.50" },
    { name: "Iced Caramel Latte", nameAr: "لاتيه الكراميل المثلج", category: ProductCategory.COFFEE, basePriceIls: "18.00", costIls: "5.00" },
    { name: "Taro Milk Tea", nameAr: "شاي الحليب بالتارو", category: ProductCategory.BUBBLE_TEA, basePriceIls: "20.00", costIls: "6.50" },
  ];

  const createdProducts = [];
  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    const product = existing ?? (await prisma.product.create({ data: p }));
    createdProducts.push(product);
  }

  for (const branch of branches) {
    for (const product of createdProducts) {
      await prisma.branchProduct.upsert({
        where: {
          branchId_productId: {
            branchId: branch.id,
            productId: product.id,
          },
        },
        update: {},
        create: {
          branchId: branch.id,
          productId: product.id,
          isAvailable: true,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`All seeded accounts use the password: ${seedPassword}`);
  for (const u of userSeeds) {
    const scope = u.branchId ? scopedBranch.name : "all branches";
    console.log(`  ${u.role.padEnd(7)} -> ${u.email}  (${scope})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
