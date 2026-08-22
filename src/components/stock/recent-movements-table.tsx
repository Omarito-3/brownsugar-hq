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
import { formatDate, formatIls } from "@/lib/format";
import { UNIT_LABELS, MOVEMENT_TYPE_LABELS } from "@/lib/stock-labels";
import type { getRecentMovements } from "@/lib/queries/stock";

type RecentMovements = Awaited<ReturnType<typeof getRecentMovements>>;

export function RecentMovementsTable({ movements }: { movements: RecentMovements }) {
  return (
    <FadeIn delay={0.25}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{formatDate(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.branchName}</TableCell>
                      <TableCell>{m.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.quantity} {UNIT_LABELS[m.unit] ?? m.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.costIls != null ? formatIls(m.costIls) : "—"}
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
