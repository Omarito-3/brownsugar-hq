import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import { UNIT_LABELS } from "@/lib/stock-labels";
import type { getStockLevelsGrid } from "@/lib/queries/stock";

type StockLevelsGrid = Awaited<ReturnType<typeof getStockLevelsGrid>>;

export function StockLevelsGrid({ data }: { data: StockLevelsGrid }) {
  const { items, branches, quantities } = data;

  return (
    <FadeIn delay={0.1}>
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No stock items configured yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    {branches.map((b) => (
                      <TableHead key={b.id} className="text-right">
                        {b.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      {branches.map((branch) => {
                        const qty = quantities[branch.id]?.[item.id] ?? 0;
                        const isOut = qty <= 0;
                        const isLow = qty > 0 && qty < item.threshold;
                        return (
                          <TableCell
                            key={branch.id}
                            className={cn(
                              "text-right tabular-nums",
                              isOut && "font-medium text-destructive",
                              isLow && "font-medium text-amber-500"
                            )}
                          >
                            {qty} {UNIT_LABELS[item.unit] ?? item.unit}
                          </TableCell>
                        );
                      })}
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
