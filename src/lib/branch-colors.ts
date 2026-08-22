/**
 * Deterministic color assignment per branch, stable across renders and pages.
 * Cycles through the theme's chart-1..5 tokens, ordered by branchId so the
 * same branch always gets the same color regardless of query order.
 */
export function assignBranchColors<T extends { id: string }>(
  branches: T[]
): Map<string, string> {
  const ordered = [...branches].sort((a, b) => a.id.localeCompare(b.id));
  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];
  const map = new Map<string, string>();
  ordered.forEach((branch, i) => {
    map.set(branch.id, palette[i % palette.length]);
  });
  return map;
}
