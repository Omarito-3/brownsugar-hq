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
      locationId: z.string().optional().or(z.literal("")),
      fromLocationId: z.string().optional().or(z.literal("")),
      toLocationId: z.string().optional().or(z.literal("")),
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
        if (!data.fromLocationId) {
          ctx.addIssue({ code: "custom", path: ["fromLocationId"], message: t("validation.fromLocationRequired") });
        }
        if (!data.toLocationId) {
          ctx.addIssue({ code: "custom", path: ["toLocationId"], message: t("validation.toLocationRequired") });
        }
        if (data.fromLocationId && data.toLocationId && data.fromLocationId === data.toLocationId) {
          ctx.addIssue({
            code: "custom",
            path: ["toLocationId"],
            message: t("validation.fromToDifferent"),
          });
        }
      } else if (!data.locationId) {
        ctx.addIssue({ code: "custom", path: ["locationId"], message: t("validation.locationRequired") });
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

export const locationTypeValues = ["WAREHOUSE", "BRANCH"] as const;

export function stockLocationSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    nameAr: z.string().max(200).optional().or(z.literal("")),
  });
}

export type StockLocationInput = z.output<ReturnType<typeof stockLocationSchema>>;

export const requestStatusValues = ["PENDING", "APPROVED", "FULFILLED", "REJECTED"] as const;

export function stockRequestSchema(t: TFunc) {
  return z.object({
    requestingLocationId: z.string().min(1, t("validation.locationRequired")),
    fulfillingLocationId: z.string().min(1, t("validation.fulfillingRequired")),
    notes: z.string().max(1000).optional().or(z.literal("")),
    items: z
      .array(
        z.object({
          stockItemId: z.string().min(1, t("validation.selectItem")),
          quantityRequested: z.coerce.number().positive(t("validation.quantityPositive")),
        })
      )
      .min(1, t("validation.atLeastOneItem"))
      .refine(
        (rows) => new Set(rows.map((r) => r.stockItemId)).size === rows.length,
        t("validation.itemUnique")
      ),
  });
}

export type StockRequestInput = z.output<ReturnType<typeof stockRequestSchema>>;
export type StockRequestFormInput = z.input<ReturnType<typeof stockRequestSchema>>;
