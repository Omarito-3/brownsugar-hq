import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const salesLineItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().int().positive("Must be at least 1"),
});

export const salesEntrySchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((value) => value <= todayDateKey(), "Date cannot be in the future"),
  totalIls: z.coerce.number().positive("Must be greater than 0"),
  orderCount: z.coerce.number().int().positive("Must be at least 1"),
  notes: z.string().max(1000).optional().or(z.literal("")),
  lineItems: z.array(salesLineItemSchema),
});

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type SalesEntryInput = z.output<typeof salesEntrySchema>;
export type SalesLineItemInput = z.output<typeof salesLineItemSchema>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type SalesEntryFormInput = z.input<typeof salesEntrySchema>;
