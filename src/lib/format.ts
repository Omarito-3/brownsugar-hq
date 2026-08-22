export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  return Number(value);
}

/** Round to 2 decimal places, avoiding floating-point drift before writing Decimal(10,2) columns. */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
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

/** Chart axis labels stay in a fixed neutral format regardless of locale — charts are LTR internals. */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** `numberingSystem: "latn"` keeps digits Western even under the Arabic locale. */
export function formatDate(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
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

/** Falls back to the English name when no Arabic name is set, or the locale isn't Arabic. */
export function localizedName(name: string, nameAr: string | null | undefined, locale: string): string {
  return locale === "ar" && nameAr ? nameAr : name;
}
