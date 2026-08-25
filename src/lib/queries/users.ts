import "server-only";

import { prisma } from "@/lib/prisma";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: Date;
};

/** Password hashes are never selected — they must not reach the client. */
export async function getUsersManaged(): Promise<ManagedUser[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
      createdAt: true,
      branch: { select: { name: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as string,
    branchId: u.branchId,
    branchName: u.branch?.name ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
}

export async function getOwnProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, branch: { select: { name: true } } },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as string,
    branchName: user.branch?.name ?? null,
  };
}
