import Link from "next/link";
import { Receipt } from "lucide-react";

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

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent",
  SUPPLIES: "Supplies",
  SALARY: "Salary",
  MARKETING: "Marketing",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

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

export function RecentExpensesTable({
  expenses,
  isOwner,
}: {
  expenses: RecentExpense[];
  isOwner: boolean;
}) {
  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="size-8" />
              <p>No expenses recorded yet.</p>
              <Link href="/finance/new" className="text-sm font-medium text-primary hover:underline">
                Add your first expense
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">ILS Value</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.branchName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {CATEGORY_LABELS[expense.category] ?? expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {expense.amountOriginal.toLocaleString()} {expense.currencyCode}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatIls(expense.amountIls)}
                      </TableCell>
                      <TableCell className="p-1">
                        <ExpenseRowActions
                          id={expense.id}
                          label={`${expense.branchName} · ${formatDate(expense.date)}`}
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
