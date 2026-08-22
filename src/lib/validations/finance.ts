import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Kept as plain literals (mirroring the Prisma `ExpenseCategory` enum) rather than
// importing the generated Prisma client here — this file is bundled into client
// components, and the generated client pulls in Node-only internals that break
// the browser build.
export const expenseCategoryValues = [
  "RENT",
  "SUPPLIES",
  "SALARY",
  "MARKETING",
  "EQUIPMENT",
  "OTHER",
] as const;
export const expenseCategorySchema = z.enum(expenseCategoryValues);

export const expenseSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((value) => value <= todayDateKey(), "Date cannot be in the future"),
  category: expenseCategorySchema,
  amountOriginal: z.coerce.number().positive("Must be greater than 0"),
  currencyCode: z.string().min(1, "Select a currency"),
  notes: z.string().max(1000).optional().or(z.literal("")),
  receiptUrl: z.string().optional().or(z.literal("")),
});

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type ExpenseInput = z.output<typeof expenseSchema>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type ExpenseFormInput = z.input<typeof expenseSchema>;
