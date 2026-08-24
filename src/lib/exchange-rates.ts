import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Live exchange rates via open.er-api.com.
 *
 * Chosen over exchangerate.host because that provider now requires a signed-up
 * API key for every call, while open.er-api.com's free endpoint is genuinely
 * keyless and returns an explicit `time_last_update_unix` we can record.
 *
 * The API is queried with ILS as the base, so `rates[CODE]` is "how much CODE
 * you get for 1 ILS". Our stored `rateToIls` is the inverse — how many ILS one
 * unit of CODE is worth — hence the 1/x below.
 */

/** Overridable so the provider can be swapped without a code change. */
const RATES_URL = process.env.EXCHANGE_RATES_URL ?? "https://open.er-api.com/v6/latest/ILS";
const REQUEST_TIMEOUT_MS = 10_000;

/** Rates older than this are surfaced as a warning in the UI. */
export const STALE_RATE_DAYS = 7;

export type RateFetchResult =
  | { ok: true; updated: string[]; skipped: string[]; fetchedAt: Date }
  | { ok: false; error: string };

type ApiResponse = {
  result: string;
  rates?: Record<string, number>;
  time_last_update_unix?: number;
  "error-type"?: string;
};

async function fetchLiveRates(): Promise<
  { ok: true; rates: Record<string, number>; fetchedAt: Date } | { ok: false; error: string }
> {
  try {
    const response = await fetch(RATES_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Always hit the network — a cached response would defeat the whole point.
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: `Rate provider returned HTTP ${response.status}` };
    }

    const data = (await response.json()) as ApiResponse;
    if (data.result !== "success" || !data.rates) {
      return { ok: false, error: `Rate provider error: ${data["error-type"] ?? "unknown"}` };
    }

    return {
      ok: true,
      rates: data.rates,
      fetchedAt: data.time_last_update_unix
        ? new Date(data.time_last_update_unix * 1000)
        : new Date(),
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: `Could not reach the rate provider: ${reason}` };
  }
}

/**
 * Refreshes every auto-updated currency from the live provider.
 *
 * On failure nothing is written — each currency keeps its last known rate, so a
 * provider outage degrades to slightly stale numbers rather than broken ones.
 * Currencies with isAutoUpdated=false are never touched, and ILS (the base) is
 * always skipped since its rate is 1 by definition.
 *
 * Note this only changes the rate used by *future* conversions. Existing sales
 * and expenses store their own amountIls, computed at write time, and are never
 * recalculated.
 */
export async function refreshExchangeRates(): Promise<RateFetchResult> {
  const currencies = await prisma.currency.findMany();
  const live = await fetchLiveRates();

  if (!live.ok) {
    console.error("[rates] refresh failed:", live.error);
    return { ok: false, error: live.error };
  }

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const currency of currencies) {
    if (currency.code === "ILS" || !currency.isAutoUpdated) {
      skipped.push(currency.code);
      continue;
    }

    const perIls = live.rates[currency.code];
    if (!perIls || perIls <= 0) {
      console.warn(`[rates] provider had no usable rate for ${currency.code}; keeping existing`);
      skipped.push(currency.code);
      continue;
    }

    await prisma.currency.update({
      where: { code: currency.code },
      data: { rateToIls: 1 / perIls, lastFetchedAt: live.fetchedAt },
    });
    updated.push(currency.code);
  }

  console.info(
    `[rates] refreshed ${updated.length} currencies (${updated.join(", ") || "none"}); skipped ${skipped.length}`
  );
  return { ok: true, updated, skipped, fetchedAt: live.fetchedAt };
}

/** True when an auto-updated currency hasn't been successfully fetched recently. */
export function isRateStale(isAutoUpdated: boolean, lastFetchedAt: Date | null): boolean {
  if (!isAutoUpdated) return false;
  if (!lastFetchedAt) return true;
  const ageDays = (Date.now() - lastFetchedAt.getTime()) / 86_400_000;
  return ageDays > STALE_RATE_DAYS;
}
