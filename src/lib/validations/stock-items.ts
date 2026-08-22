import { z } from "zod";

export const unitValues = ["KG", "G", "L", "ML", "PIECE", "PACK"] as const;

export const stockItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  nameAr: z.string().max(200).optional().or(z.literal("")),
  unit: z.enum(unitValues),
  lowStockThreshold: z.coerce.number().nonnegative("Must be zero or greater"),
});

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type StockItemInput = z.output<typeof stockItemSchema>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type StockItemFormInput = z.input<typeof stockItemSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type SupplierInput = z.output<typeof supplierSchema>;
