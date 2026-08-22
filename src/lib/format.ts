export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  return Number(value);
}

const ilsFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ILS",
  currencyDisplay: "symbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ilsFormatterPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ILS",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatIls(amount: unknown, precise = false): string {
  const value = toNumber(amount);
  return precise ? ilsFormatterPrecise.format(value) : ilsFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: unknown): string {
  return numberFormatter.format(toNumber(value));
}

export function formatPercent(value: number, options?: { showSign?: boolean }): string {
  const showSign = options?.showSign ?? true;
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** YYYY-MM-DD in UTC, matching how @db.Date columns round-trip through Prisma. */
export function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}
