"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/fade-in";
import { ExpenseRowActions } from "@/components/finance/expense-row-actions";
import { formatDate, formatIls } from "@/lib/format";

export type RecentExpense = {
  id: string;
  date: Date;
  branchId: string;
  branchName: string;
  category: string;
  amountOriginal: number;
  currencyCode: string;
  amountIls: number;
};

const CATEGORY_KEYS = ["RENT", "SUPPLIES", "SALARY", "MARKETING", "EQUIPMENT", "OTHER"] as const;

export function RecentExpensesTable({
  expenses,
  isOwner,
}: {
  expenses: RecentExpense[];
  isOwner: boolean;
}) {
  const t = useTranslations("finance");
  const locale = useLocale();

  function categoryLabel(category: string): string {
    return (CATEGORY_KEYS as readonly string[]).includes(category)
      ? t(`categories.${category}` as (typeof CATEGORY_KEYS)[number])
      : category;
  }

  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle>{t("recentExpenses")}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="size-8" />
              <p>{t("noExpensesYet")}</p>
              <Link href="/finance/new" className="text-sm font-medium text-primary hover:underline">
                {t("addFirstExpense")}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnBranch")}</TableHead>
                    <TableHead>{t("columnDate")}</TableHead>
                    <TableHead>{t("columnCategory")}</TableHead>
                    <TableHead className="text-end">{t("columnAmount")}</TableHead>
                    <TableHead className="text-end">{t("columnIlsValue")}</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.branchName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(expense.date, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabel(expense.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {expense.amountOriginal.toLocaleString("en-US")} {expense.currencyCode}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatIls(expense.amountIls)}
                      </TableCell>
                      <TableCell className="p-1">
                        <ExpenseRowActions
                          id={expense.id}
                          label={`${expense.branchName} · ${formatDate(expense.date, locale)}`}
                          canDelete={isOwner}
                        />
                      </TableCell>
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
