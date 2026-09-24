/**
 * Role/branch permission rules shared by pages, queries, and server actions.
 *
 * Deliberately free of server-only imports so the rules can be unit-tested and
 * reused anywhere. See docs/DECISIONS.md D-016 for the business rules.
 */

type RoleLike = string;

/**
 * What a user may see:
 *   - "all":    OWNER — every branch. `branchId` is undefined, which the query
 *               helpers read as "no branch filter".
 *   - "branch": MANAGER/STAFF — only their assigned branch.
 *   - "none":   MANAGER/STAFF with no branch assigned. Fails closed: callers must
 *               not load any branch-scoped data for this user.
 *
 * Never turn a missing branch into `undefined` directly — to the queries that
 * means "all branches", which is exactly the leak this type exists to prevent.
 */
export type BranchScope =
  | { kind: "all"; branchId: undefined }
  | { kind: "branch"; branchId: string }
  | { kind: "none"; branchId: undefined };

export function getBranchScope(user: {
  role: RoleLike;
  branchId?: string | null;
}): BranchScope {
  if (user.role === "OWNER") return { kind: "all", branchId: undefined };
  if (user.branchId) return { kind: "branch", branchId: user.branchId };
  return { kind: "none", branchId: undefined };
}

/** Individual and aggregate salary figures are OWNER-only (D-016). */
export function canViewSalaries(role: RoleLike): boolean {
  return role === "OWNER";
}
