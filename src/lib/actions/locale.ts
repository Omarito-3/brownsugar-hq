"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locales";

export async function setLocale(locale: Locale): Promise<{ ok: true } | { ok: false }> {
  if (!isLocale(locale)) return { ok: false };

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { ok: true };
}
