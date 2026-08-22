"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CurrencyActionResult = { ok: true } | { ok: false; error: string };

export async function updateCurrencyRate(input: {
  code: string;
  rateToIls: number;
}): Promise<CurrencyActionResult> {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("settings.currenciesPage"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") {
    return { ok: false, error: t("ownerOnly") };
  }

  const updateCurrencyRateSchema = z.object({
    code: z.string().min(1),
    rateToIls: z.coerce.number().positive(t("rateMustBePositive")),
  });

  const parsed = updateCurrencyRateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  await prisma.currency.update({
    where: { code: parsed.data.code },
    data: { rateToIls: parsed.data.rateToIls },
  });

  revalidatePath("/settings/currencies");
  return { ok: true };
}
