import { NextResponse } from "next/server";

import { refreshExchangeRates } from "@/lib/exchange-rates";

/**
 * Scheduled exchange-rate refresh, shaped for Vercel Cron.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`. When CRON_SECRET is set we
 * require it, so the endpoint can't be triggered by anyone who finds the URL.
 * With no secret configured (local dev) the route stays open — set CRON_SECRET
 * in any deployed environment.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await refreshExchangeRates();

  // A provider outage isn't a server fault — report it as 502 so cron logs show
  // the difference between "we failed" and "they were unreachable".
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
