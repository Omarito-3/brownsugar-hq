"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/locales";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-input p-0.5 text-xs font-medium",
        compact && "text-[11px]"
      )}
      aria-label={t("label")}
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        disabled={isPending}
      >
        {t("en")}
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          locale === "ar"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        disabled={isPending}
      >
        {t("ar")}
      </button>
    </div>
  );
}
