import { z } from "zod";

type TFunc = (key: string) => string;

export const taskStatusValues = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const taskPriorityValues = ["LOW", "MEDIUM", "HIGH"] as const;
export const documentCategoryValues = [
  "CONTRACT",
  "LICENSE",
  "TENDER",
  "INVOICE",
  "INSURANCE",
  "OTHER",
] as const;

export function taskSchema(t: TFunc) {
  return z.object({
    title: z.string().min(1, t("validation.titleRequired")).max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    branchId: z.string().optional().or(z.literal("")),
    assignedToId: z.string().optional().or(z.literal("")),
    status: z.enum(taskStatusValues),
    priority: z.enum(taskPriorityValues),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate"))
      .optional()
      .or(z.literal("")),
  });
}

/** Post-validation shape (numbers coerced) — what server actions receive. */
export type TaskInput = z.output<ReturnType<typeof taskSchema>>;

/** Pre-validation shape — what the form holds. */
export type TaskFormInput = z.input<ReturnType<typeof taskSchema>>;

export function documentSchema(t: TFunc) {
  return z.object({
    title: z.string().min(1, t("validation.titleRequired")).max(200),
    category: z.enum(documentCategoryValues),
    branchId: z.string().optional().or(z.literal("")),
    fileUrl: z.string().min(1, t("validation.fileRequired")),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate"))
      .optional()
      .or(z.literal("")),
    notes: z.string().max(1000).optional().or(z.literal("")),
  });
}

export type DocumentInput = z.output<ReturnType<typeof documentSchema>>;
export type DocumentFormInput = z.input<ReturnType<typeof documentSchema>>;
