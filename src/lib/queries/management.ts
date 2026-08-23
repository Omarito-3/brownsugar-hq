import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/format";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  branchId: string | null;
  branchName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: Date;
};

function branchScopeWhere(scopedBranchId?: string) {
  return scopedBranchId ? { OR: [{ branchId: null }, { branchId: scopedBranchId }] } : {};
}

function mapTask(t: {
  id: string;
  title: string;
  description: string | null;
  branchId: string | null;
  branch: { name: string } | null;
  assignedToId: string | null;
  assignedTo: { name: string } | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
}): TaskRow {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    branchId: t.branchId,
    branchName: t.branch?.name ?? null,
    assignedToId: t.assignedToId,
    assignedToName: t.assignedTo?.name ?? null,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? toDateKey(t.dueDate) : null,
    createdAt: t.createdAt,
  };
}

export async function getTasksForBoard(scopedBranchId?: string): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: branchScopeWhere(scopedBranchId),
    include: { branch: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return tasks.map(mapTask);
}

export async function getMyTasks(userId: string): Promise<TaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    include: { branch: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return tasks.map(mapTask);
}

export async function getOpenHighPriorityTaskCount(
  scopedBranchId?: string,
  onlyAssignedToId?: string
): Promise<number> {
  return prisma.task.count({
    where: {
      priority: "HIGH",
      status: { not: "DONE" },
      ...(onlyAssignedToId ? { assignedToId: onlyAssignedToId } : branchScopeWhere(scopedBranchId)),
    },
  });
}

export async function getTaskForEdit(id: string) {
  const t = await prisma.task.findUnique({ where: { id } });
  if (!t) return null;

  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    branchId: t.branchId ?? "",
    assignedToId: t.assignedToId ?? "",
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? toDateKey(t.dueDate) : "",
  };
}

export type DocumentRow = {
  id: string;
  title: string;
  category: string;
  branchId: string | null;
  branchName: string | null;
  fileUrl: string;
  expiryDate: string | null;
  notes: string | null;
  createdAt: Date;
};

export async function getDocuments(scopedBranchId?: string): Promise<DocumentRow[]> {
  const docs = await prisma.document.findMany({
    where: branchScopeWhere(scopedBranchId),
    include: { branch: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }],
  });

  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category as string,
    branchId: d.branchId,
    branchName: d.branch?.name ?? null,
    fileUrl: d.fileUrl,
    expiryDate: d.expiryDate ? toDateKey(d.expiryDate) : null,
    notes: d.notes,
    createdAt: d.createdAt,
  }));
}

export type ExpiringDocument = {
  id: string;
  title: string;
  branchName: string | null;
  expiryDate: string;
  isExpired: boolean;
};

export async function getExpiringDocuments(
  scopedBranchId?: string,
  withinDays = 30
): Promise<ExpiringDocument[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setUTCDate(threshold.getUTCDate() + withinDays);

  const docs = await prisma.document.findMany({
    where: {
      expiryDate: { lte: threshold },
      ...branchScopeWhere(scopedBranchId),
    },
    include: { branch: { select: { name: true } } },
    orderBy: { expiryDate: "asc" },
  });

  return docs
    .filter((d) => d.expiryDate != null)
    .map((d) => ({
      id: d.id,
      title: d.title,
      branchName: d.branch?.name ?? null,
      expiryDate: toDateKey(d.expiryDate!),
      isExpired: d.expiryDate! < today,
    }));
}
