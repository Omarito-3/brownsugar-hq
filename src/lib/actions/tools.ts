"use server";

import { auth } from "@/auth";
import { getBreakEvenSnapshot, type BreakEvenSnapshot } from "@/lib/queries/tools";

export type BreakEvenResult =
  | { ok: true; data: BreakEvenSnapshot }
  | { ok: false; error: string };

/**
 * Read-only lookup for the break-even tab.
 *
 * The calculator never writes; this exists purely so the client can refetch
 * when the branch/month pickers change. Branch scoping still applies.
 */
export async function loadBreakEvenData(
  branchId: string,
  monthKey: string
): Promise<BreakEvenResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };

  const { role, branchId: userBranchId } = session.user;
  if (role !== "OWNER" && branchId !== userBranchId) {
    return { ok: false, error: "No access to that branch." };
  }

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return { ok: false, error: "Invalid month." };
  }

  const data = await getBreakEvenSnapshot(branchId, monthKey);
  return { ok: true, data };
}
