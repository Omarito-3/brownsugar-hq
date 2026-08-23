import { z } from "zod";

type TFunc = (key: string) => string;

export const positionValues = [
  "BARISTA",
  "CASHIER",
  "SHIFT_LEAD",
  "BRANCH_MANAGER",
  "CLEANER",
  "OTHER",
] as const;

export const shiftValues = ["MORNING", "EVENING", "FULL_DAY"] as const;

export function employeeSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    phone: z.string().max(50).optional().or(z.literal("")),
    branchId: z.string().min(1, t("validation.branchRequired")),
    position: z.enum(positionValues),
    salaryIls: z.coerce.number().positive(t("validation.salaryPositive")),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type EmployeeInput = z.output<ReturnType<typeof employeeSchema>>;

/** Pre-validation shape (numeric fields are `unknown` before coercion) — what the form holds. */
export type EmployeeFormInput = z.input<ReturnType<typeof employeeSchema>>;

export const dayScheduleSchema = z.object({
  branchId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignments: z.array(
    z.object({
      employeeId: z.string().min(1),
      shift: z.enum(shiftValues).nullable(),
    })
  ),
});

export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;

export const generateSalarySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type GenerateSalaryInput = z.infer<typeof generateSalarySchema>;
