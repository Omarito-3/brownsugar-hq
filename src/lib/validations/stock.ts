import { z } from "zod";

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

type TFunc = (key: string) => string;

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

export const adjustmentDirectionValues = ["INCREASE", "DECREASE"] as const;

export function movementSchema(t: TFunc) {
  return z
    .object({
      type: z.enum(movementTypeValues),
      branchId: z.string().optional().or(z.literal("")),
      fromBranchId: z.string().optional().or(z.literal("")),
      toBranchId: z.string().optional().or(z.literal("")),
      stockItemId: z.string().min(1, t("validation.selectItem")),
      quantity: z.coerce.number().positive(t("validation.quantityPositive")),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate"))
        .refine((value) => value <= todayDateKey(), t("validation.dateFuture")),
      supplierId: z.string().optional().or(z.literal("")),
      costIls: z.coerce.number().nonnegative(t("validation.costNonNegative")).optional(),
      direction: z.enum(adjustmentDirectionValues).optional().or(z.literal("")),
      notes: z.string().max(1000).optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (data.type === "TRANSFER") {
        if (!data.fromBranchId) {
          ctx.addIssue({ code: "custom", path: ["fromBranchId"], message: t("validation.fromBranchRequired") });
        }
        if (!data.toBranchId) {
          ctx.addIssue({ code: "custom", path: ["toBranchId"], message: t("validation.toBranchRequired") });
        }
        if (data.fromBranchId && data.toBranchId && data.fromBranchId === data.toBranchId) {
          ctx.addIssue({
            code: "custom",
            path: ["toBranchId"],
            message: t("validation.fromToDifferent"),
          });
        }
      } else if (!data.branchId) {
        ctx.addIssue({ code: "custom", path: ["branchId"], message: t("validation.branchRequired") });
      }

      if (data.type === "ADJUSTMENT" && !data.direction) {
        ctx.addIssue({
          code: "custom",
          path: ["direction"],
          message: t("validation.directionRequired"),
        });
      }
    });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type MovementInput = z.output<ReturnType<typeof movementSchema>>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type MovementFormInput = z.input<ReturnType<typeof movementSchema>>;
