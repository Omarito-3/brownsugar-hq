"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { localizedName } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockLocationRow } from "@/lib/queries/stock";

const ALL = "ALL";

export function LocationSelector({
  locations,
  selected,
}: {
  locations: StockLocationRow[];
  selected?: string;
}) {
  const t = useTranslations("stock");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("location");
    else params.set("location", value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select value={selected ?? ALL} onValueChange={onChange}>
      <SelectTrigger className="h-12 w-full text-base sm:w-56" aria-label={t("filterLocation")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} className="text-base">
          {t("allLocations")}
        </SelectItem>
        {locations.map((l) => (
          <SelectItem key={l.id} value={l.id} className="text-base">
            {localizedName(l.name, l.nameAr, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
