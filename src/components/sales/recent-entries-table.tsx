import Link from "next/link";
import { ReceiptText } from "lucide-react";

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
  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <ReceiptText className="size-8" />
              <p>No sales entries yet.</p>
              <Link href="/sales/new" className="text-sm font-medium text-primary hover:underline">
                Add your first entry
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    {canManage && <TableHead className="w-0" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.branchName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatIls(entry.totalIls)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(entry.orderCount)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="p-1">
                          <EntryRowActions
                            id={entry.id}
                            label={`${entry.branchName} · ${formatDate(entry.date)}`}
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
