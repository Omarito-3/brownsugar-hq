"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/fade-in";
import { EntryRowActions } from "@/components/sales/entry-row-actions";
import { formatDate, formatIls, formatNumber } from "@/lib/format";

export type RecentEntry = {
  id: string;
  date: Date;
  totalIls: number;
  orderCount: number;
  branchId: string;
  branchName: string;
};

export function RecentEntriesTable({
  entries,
  canManage,
}: {
  entries: RecentEntry[];
  canManage: boolean;
}) {
  const t = useTranslations("sales");
  const locale = useLocale();

  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle>{t("recentEntries")}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <ReceiptText className="size-8" />
              <p>{t("noEntriesYet")}</p>
              <Link href="/sales/new" className="text-sm font-medium text-primary hover:underline">
                {t("addFirstEntry")}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnBranch")}</TableHead>
                    <TableHead>{t("columnDate")}</TableHead>
                    <TableHead className="text-end">{t("columnTotal")}</TableHead>
                    <TableHead className="text-end">{t("columnOrders")}</TableHead>
                    {canManage && <TableHead className="w-0" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.branchName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(entry.date, locale)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatIls(entry.totalIls)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatNumber(entry.orderCount)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="p-1">
                          <EntryRowActions
                            id={entry.id}
                            label={`${entry.branchName} · ${formatDate(entry.date, locale)}`}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
