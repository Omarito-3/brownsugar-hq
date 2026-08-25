import { z } from "zod";

type TFunc = (key: string) => string;

export const MIN_PASSWORD_LENGTH = 8;

export const roleValues = ["OWNER", "MANAGER", "STAFF"] as const;

export function profileSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
  });
}

export type ProfileInput = z.output<ReturnType<typeof profileSchema>>;

export function changePasswordSchema(t: TFunc) {
  return z
    .object({
      currentPassword: z.string().min(1, t("validation.currentPasswordRequired")),
      newPassword: z.string().min(MIN_PASSWORD_LENGTH, t("validation.passwordTooShort")),
      confirmPassword: z.string().min(1, t("validation.confirmRequired")),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t("validation.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    })
    .refine((d) => d.newPassword !== d.currentPassword, {
      message: t("validation.passwordUnchanged"),
      path: ["newPassword"],
    });
}

export type ChangePasswordInput = z.output<ReturnType<typeof changePasswordSchema>>;

export function createUserSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    email: z.string().email(t("validation.invalidEmail")),
    password: z.string().min(MIN_PASSWORD_LENGTH, t("validation.passwordTooShort")),
    role: z.enum(roleValues),
    branchId: z.string().optional().or(z.literal("")),
  });
}

export type CreateUserInput = z.output<ReturnType<typeof createUserSchema>>;

export function updateUserSchema(t: TFunc) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(200),
    email: z.string().email(t("validation.invalidEmail")),
    role: z.enum(roleValues),
    branchId: z.string().optional().or(z.literal("")),
  });
}

export type UpdateUserInput = z.output<ReturnType<typeof updateUserSchema>>;

export function resetPasswordSchema(t: TFunc) {
  return z.object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, t("validation.passwordTooShort")),
  });
}

export type ResetPasswordInput = z.output<ReturnType<typeof resetPasswordSchema>>;
