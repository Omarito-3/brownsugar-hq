import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type TFunc = (key: string) => string;

export function salesLineItemSchema(t: TFunc) {
  return z.object({
    productId: z.string().min(1, t("validation.selectProduct")),
    quantity: z.coerce.number().int().positive(t("validation.quantityMin")),
  });
}

export function salesCurrencyAmountSchema(t: TFunc) {
  return z.object({
    currencyCode: z.string().min(1, t("validation.selectCurrency")),
    amountOriginal: z.coerce.number().positive(t("validation.amountPositive")),
  });
}

export function salesEntrySchema(t: TFunc) {
  return z.object({
    branchId: z.string().min(1, t("validation.branchRequired")),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate"))
      .refine((value) => value <= todayDateKey(), t("validation.dateFuture")),
    orderCount: z.coerce.number().int().positive(t("validation.orderCountMin")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    currencyAmounts: z
      .array(salesCurrencyAmountSchema(t))
      .min(1, t("validation.atLeastOneCurrency"))
      .refine(
        (rows) => new Set(rows.map((r) => r.currencyCode)).size === rows.length,
        t("validation.currencyUnique")
      ),
    lineItems: z.array(salesLineItemSchema(t)),
  });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type SalesEntryInput = z.output<ReturnType<typeof salesEntrySchema>>;
export type SalesLineItemInput = z.output<ReturnType<typeof salesLineItemSchema>>;
export type SalesCurrencyAmountInput = z.output<ReturnType<typeof salesCurrencyAmountSchema>>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type SalesEntryFormInput = z.input<ReturnType<typeof salesEntrySchema>>;
