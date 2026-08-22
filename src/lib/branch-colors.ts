const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/**
 * Deterministic color assignment across a set of string keys, stable across
 * renders and pages. Cycles through the theme's chart-1..6 tokens in sorted
 * key order, so the same key always gets the same color regardless of query order.
 */
export function assignColorsForKeys(keys: string[]): Map<string, string> {
  const ordered = [...new Set(keys)].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  ordered.forEach((key, i) => {
    map.set(key, PALETTE[i % PALETTE.length]);
  });
  return map;
}

/** Convenience wrapper for branch objects — see {@link assignColorsForKeys}. */
export function assignBranchColors<T extends { id: string }>(branches: T[]): Map<string, string> {
  return assignColorsForKeys(branches.map((b) => b.id));
}
