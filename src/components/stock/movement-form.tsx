"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  movementSchema,
  movementTypeValues,
  adjustmentDirectionValues,
  type MovementInput,
  type MovementFormInput,
} from "@/lib/validations/stock";
import { recordMovement } from "@/lib/actions/stock";
import { useSound } from "@/hooks/use-sound";
import { todayDateKey, formatIls } from "@/lib/format";
import { UNIT_LABELS, MOVEMENT_TYPE_LABELS, ADJUSTMENT_DIRECTION_LABELS } from "@/lib/stock-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { id: string; name: string };
type ItemOption = { id: string; name: string; unit: string };
type SupplierOption = { id: string; name: string };

export function MovementForm({
  branches,
  items,
  suppliers,
  isOwner,
  defaultBranchId,
}: {
  branches: BranchOption[];
  items: ItemOption[];
  suppliers: SupplierOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const router = useRouter();
  const playSaved = useSound("saved");
  const [isPending, startTransition] = useTransition();

  const availableTypes = isOwner
    ? movementTypeValues
    : movementTypeValues.filter((t) => t !== "TRANSFER");

  const defaultValues: MovementFormInput = {
    type: "PURCHASE",
    branchId: defaultBranchId,
    fromBranchId: "",
    toBranchId: "",
    stockItemId: "",
    quantity: "",
    date: todayDateKey(),
    supplierId: "",
    costIls: "",
    direction: "",
    notes: "",
  };

  const form = useForm<MovementFormInput, unknown, MovementInput>({
    resolver: zodResolver(movementSchema),
    defaultValues,
  });

  const type = useWatch({ control: form.control, name: "type" });
  const stockItemId = useWatch({ control: form.control, name: "stockItemId" });
  const selectedItem = items.find((i) => i.id === stockItemId);
  const isTransfer = type === "TRANSFER";
  const isPurchase = type === "PURCHASE";
  const isAdjustment = type === "ADJUSTMENT";

  function onSubmit(values: MovementInput) {
    startTransition(async () => {
      const result = await recordMovement(values);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      playSaved();
      if (result.expenseCreated) {
        toast.success(
          `Movement saved — ${formatIls(result.expenseCreated)} expense automatically logged in Finance.`
        );
      } else {
        toast.success("Movement saved.");
      }
      router.push("/stock");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Movement Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-base">
                      {MOVEMENT_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isTransfer ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fromBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">From Branch</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full text-base">
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-base">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toBranchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">To Branch</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full text-base">
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-base">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : isOwner ? (
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Branch</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-base">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div>
            <Label className="text-base">Branch</Label>
            <div className="mt-2 flex h-12 items-center rounded-md border border-input bg-muted px-3 text-base">
              {branches[0]?.name ?? "No branch assigned"}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="stockItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Item</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-base">
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Quantity
                  {selectedItem && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({UNIT_LABELS[selectedItem.unit] ?? selectedItem.unit})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="h-12 text-base"
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Date</FormLabel>
                <FormControl>
                  <Input type="date" max={todayDateKey()} className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isAdjustment && (
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Direction</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder="Increase or decrease?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {adjustmentDirectionValues.map((d) => (
                      <SelectItem key={d} value={d} className="text-base">
                        {ADJUSTMENT_DIRECTION_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isPurchase && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Supplier (optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full text-base">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-base">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costIls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Cost (₪, optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="h-12 text-base"
                        {...field}
                        value={field.value as number | string}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If you enter a cost, we&apos;ll automatically log a matching expense in Finance.
            </p>
          </>
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} className="text-base" placeholder="Anything worth noting…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save movement
        </Button>
      </form>
    </Form>
  );
}
