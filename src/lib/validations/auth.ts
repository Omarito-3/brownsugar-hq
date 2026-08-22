import { z } from "zod";

export function loginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t("validation.invalidEmail")),
    password: z.string().min(1, t("validation.passwordRequired")),
  });
}

export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
