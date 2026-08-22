import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Client-facing movement types. TRANSFER is a UI-level concept only — the
 * server splits it into a TRANSFER_OUT + TRANSFER_IN pair (the two real
 * StockMovementType enum values) in a single transaction.
 */
export const movementTypeValues = [
  "PURCHASE",
  "CONSUMPTION",
  "WASTE",
  "TRANSFER",
  "ADJUSTMENT",
] as const;

export const movementSchema = z
  .object({
    type: z.enum(movementTypeValues),
    branchId: z.string().optional().or(z.literal("")),
    fromBranchId: z.string().optional().or(z.literal("")),
    toBranchId: z.string().optional().or(z.literal("")),
    stockItemId: z.string().min(1, "Select an item"),
    quantity: z.coerce.number().positive("Must be greater than 0"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
      .refine((value) => value <= todayDateKey(), "Date cannot be in the future"),
    supplierId: z.string().optional().or(z.literal("")),
    costIls: z.coerce.number().nonnegative("Must be zero or greater").optional(),
    notes: z.string().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "TRANSFER") {
      if (!data.fromBranchId) {
        ctx.addIssue({ code: "custom", path: ["fromBranchId"], message: "From branch is required" });
      }
      if (!data.toBranchId) {
        ctx.addIssue({ code: "custom", path: ["toBranchId"], message: "To branch is required" });
      }
      if (data.fromBranchId && data.toBranchId && data.fromBranchId === data.toBranchId) {
        ctx.addIssue({
          code: "custom",
          path: ["toBranchId"],
          message: "From and to branch must be different",
        });
      }
    } else if (!data.branchId) {
      ctx.addIssue({ code: "custom", path: ["branchId"], message: "Branch is required" });
    }
  });

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type MovementInput = z.output<typeof movementSchema>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type MovementFormInput = z.input<typeof movementSchema>;
