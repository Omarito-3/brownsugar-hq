import "server-only";

import { prisma } from "@/lib/prisma";
import { toNumber, toDateKey } from "@/lib/format";

function branchScopeWhere(scopedBranchId?: string) {
  return scopedBranchId ? { OR: [{ branchId: null }, { branchId: scopedBranchId }] } : {};
}

export type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  branchId: string | null;
  branchName: string | null;
  startDate: string;
  endDate: string;
  budgetIls: number | null;
  channel: string;
  notes: string | null;
  hasExpense: boolean;
};

export async function getCampaigns(scopedBranchId?: string): Promise<CampaignRow[]> {
  const campaigns = await prisma.campaign.findMany({
    where: branchScopeWhere(scopedBranchId),
    include: { branch: { select: { name: true } } },
    orderBy: { startDate: "desc" },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    branchId: c.branchId,
    branchName: c.branch?.name ?? null,
    startDate: toDateKey(c.startDate),
    endDate: toDateKey(c.endDate),
    budgetIls: c.budgetIls != null ? toNumber(c.budgetIls) : null,
    channel: c.channel as string,
    notes: c.notes,
    hasExpense: c.expenseId != null,
  }));
}

export async function getCampaignForEdit(id: string) {
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    branchId: c.branchId ?? "",
    startDate: toDateKey(c.startDate),
    endDate: toDateKey(c.endDate),
    budgetIls: c.budgetIls != null ? toNumber(c.budgetIls) : "",
    channel: c.channel,
    notes: c.notes ?? "",
  };
}

export type CampaignImpact = { avgDuring: number; avgBefore: number; changePercent: number | null };

export async function getCampaignImpact(campaign: {
  branchId: string | null;
  startDate: string;
  endDate: string;
}): Promise<CampaignImpact | null> {
  const start = new Date(`${campaign.startDate}T00:00:00.000Z`);
  const end = new Date(`${campaign.endDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const effectiveEnd = end < today ? end : today;
  if (effectiveEnd < start) return null;

  const duringDays = Math.floor((effectiveEnd.getTime() - start.getTime()) / 86400000) + 1;
  const beforeStart = new Date(start);
  beforeStart.setUTCDate(beforeStart.getUTCDate() - 14);
  const beforeEnd = new Date(start);
  beforeEnd.setUTCDate(beforeEnd.getUTCDate() - 1);

  const branchWhere = campaign.branchId ? { branchId: campaign.branchId } : {};

  const [duringAgg, beforeAgg] = await Promise.all([
    prisma.salesEntry.aggregate({
      where: { date: { gte: start, lte: effectiveEnd }, ...branchWhere },
      _sum: { totalIls: true },
    }),
    prisma.salesEntry.aggregate({
      where: { date: { gte: beforeStart, lte: beforeEnd }, ...branchWhere },
      _sum: { totalIls: true },
    }),
  ]);

  const avgDuring = toNumber(duringAgg._sum.totalIls) / duringDays;
  const avgBefore = toNumber(beforeAgg._sum.totalIls) / 14;
  const changePercent = avgBefore > 0 ? ((avgDuring - avgBefore) / avgBefore) * 100 : null;

  return { avgDuring, avgBefore, changePercent };
}

export type CampaignWithImpact = CampaignRow & { impact: CampaignImpact | null };

export async function getCampaignsWithImpact(scopedBranchId?: string): Promise<CampaignWithImpact[]> {
  const campaigns = await getCampaigns(scopedBranchId);
  const impacts = await Promise.all(campaigns.map((c) => getCampaignImpact(c)));
  return campaigns.map((c, i) => ({ ...c, impact: impacts[i] }));
}

export type ExperimentRow = {
  id: string;
  productName: string;
  notes: string;
  status: string;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
};

export async function getMenuExperiments(scopedBranchId?: string): Promise<ExperimentRow[]> {
  const rows = await prisma.menuExperiment.findMany({
    where: branchScopeWhere(scopedBranchId),
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    productName: r.productName,
    notes: r.notes,
    status: r.status as string,
    branchId: r.branchId,
    branchName: r.branch?.name ?? null,
    createdAt: r.createdAt,
  }));
}

export async function getExperimentForEdit(id: string) {
  const r = await prisma.menuExperiment.findUnique({ where: { id } });
  if (!r) return null;

  return {
    id: r.id,
    productName: r.productName,
    notes: r.notes,
    status: r.status,
    branchId: r.branchId ?? "",
  };
}

export type FeedbackRow = {
  id: string;
  branchId: string;
  branchName: string;
  date: string;
  source: string;
  sentiment: string;
  content: string;
  createdAt: Date;
};

export async function getFeedback(scopedBranchId?: string): Promise<FeedbackRow[]> {
  const rows = await prisma.feedback.findMany({
    where: scopedBranchId ? { branchId: scopedBranchId } : {},
    include: { branch: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    branchId: r.branchId,
    branchName: r.branch.name,
    date: toDateKey(r.date),
    source: r.source as string,
    sentiment: r.sentiment as string,
    content: r.content,
    createdAt: r.createdAt,
  }));
}

export async function getFeedbackForEdit(id: string) {
  const r = await prisma.feedback.findUnique({ where: { id } });
  if (!r) return null;

  return {
    id: r.id,
    branchId: r.branchId,
    date: toDateKey(r.date),
    source: r.source,
    sentiment: r.sentiment,
    content: r.content,
  };
}
