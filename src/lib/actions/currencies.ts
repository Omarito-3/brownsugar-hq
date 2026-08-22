"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const updateCurrencyRateSchema = z.object({
  code: z.string().min(1),
  rateToIls: z.coerce.number().positive("Rate must be greater than 0"),
});

export type CurrencyActionResult = { ok: true } | { ok: false; error: string };

export async function updateCurrencyRate(input: {
  code: string;
  rateToIls: number;
}): Promise<CurrencyActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };
  if (session.user.role !== "OWNER") {
    return { ok: false, error: "Only owners can update currency rates." };
  }

  const parsed = updateCurrencyRateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.currency.update({
    where: { code: parsed.data.code },
    data: { rateToIls: parsed.data.rateToIls },
  });

  revalidatePath("/settings/currencies");
  return { ok: true };
}
