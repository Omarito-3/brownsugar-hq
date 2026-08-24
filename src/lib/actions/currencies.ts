"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { refreshExchangeRates } from "@/lib/exchange-rates";

export type CurrencyActionResult = { ok: true } | { ok: false; error: string };
export type RefreshRatesResult = { ok: true; updated: number } | { ok: false; error: string };

async function requireOwner() {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("settings.currenciesPage"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };
  if (session.user.role !== "OWNER") return { ok: false as const, error: t("ownerOnly") };
  return { ok: true as const };
}

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

/** Flips a currency between the live feed and a manually held rate. */
export async function setCurrencyAutoUpdated(
  code: string,
  isAutoUpdated: boolean
): Promise<CurrencyActionResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  await prisma.currency.update({ where: { code }, data: { isAutoUpdated } });

  revalidatePath("/settings/currencies");
  return { ok: true };
}

export async function refreshRatesNow(): Promise<RefreshRatesResult> {
  const access = await requireOwner();
  if (!access.ok) return access;

  const result = await refreshExchangeRates();
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/settings/currencies");
  return { ok: true, updated: result.updated.length };
}
