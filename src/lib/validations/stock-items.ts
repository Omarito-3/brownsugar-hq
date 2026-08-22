import { z } from "zod";

type TFunc = (key: string) => string;

export const unitValues = ["KG", "G", "L", "ML", "PIECE", "PACK"] as const;

export function stockItemSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    nameAr: z.string().max(200).optional().or(z.literal("")),
    unit: z.enum(unitValues),
    lowStockThreshold: z.coerce.number().nonnegative(t("validation.thresholdNonNegative")),
  });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type StockItemInput = z.output<ReturnType<typeof stockItemSchema>>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type StockItemFormInput = z.input<ReturnType<typeof stockItemSchema>>;

export function supplierSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    phone: z.string().max(50).optional().or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  });
}

export type SupplierInput = z.output<ReturnType<typeof supplierSchema>>;
