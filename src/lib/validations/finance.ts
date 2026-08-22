import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type TFunc = (key: string) => string;

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

export function expenseSchema(t: TFunc) {
  return z.object({
    branchId: z.string().min(1, t("validation.branchRequired")),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate"))
      .refine((value) => value <= todayDateKey(), t("validation.dateFuture")),
    category: expenseCategorySchema,
    amountOriginal: z.coerce.number().positive(t("validation.amountPositive")),
    currencyCode: z.string().min(1, t("validation.selectCurrency")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    receiptUrl: z.string().optional().or(z.literal("")),
  });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type ExpenseInput = z.output<ReturnType<typeof expenseSchema>>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type ExpenseFormInput = z.input<ReturnType<typeof expenseSchema>>;
