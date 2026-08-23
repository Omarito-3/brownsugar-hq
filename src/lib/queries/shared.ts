import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export async function getBranchesForUser(scopedBranchId?: string) {
  return prisma.branch.findMany({
    where: scopedBranchId ? { id: scopedBranchId } : { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getCurrencies() {
  const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  return currencies.map((c) => ({ code: c.code, rateToIls: toNumber(c.rateToIls) }));
}

export async function getAssignableUsers(scopedBranchId?: string) {
  return prisma.user.findMany({
    where: scopedBranchId ? { branchId: scopedBranchId } : {},
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getCurrenciesWithMeta() {
  const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  return currencies.map((c) => ({
    code: c.code,
    rateToIls: toNumber(c.rateToIls),
    updatedAt: c.updatedAt,
  }));
}
