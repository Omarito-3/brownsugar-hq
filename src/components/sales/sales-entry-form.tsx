"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  salesEntrySchema,
  type SalesEntryInput,
  type SalesEntryFormInput,
} from "@/lib/validations/sales";
import { createSalesEntry, updateSalesEntry } from "@/lib/actions/sales";
import { useSound } from "@/hooks/use-sound";
import { cn } from "@/lib/utils";
import { todayDateKey, formatIls, toNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type BranchOption = { id: string; name: string };
type ProductOption = { id: string; name: string };
type CurrencyOption = { code: string; rateToIls: number };

export function SalesEntryForm({
  mode,
  entryId,
  branches,
  branchProductsMap,
  currencies,
  isOwner,
  defaultValues,
}: {
  mode: "create" | "edit";
  entryId?: string;
  branches: BranchOption[];
  branchProductsMap: Record<string, ProductOption[]>;
  currencies: CurrencyOption[];
  isOwner: boolean;
  defaultValues: SalesEntryFormInput;
}) {
  const router = useRouter();
  const playSaved = useSound("saved");
  const [isPending, startTransition] = useTransition();
  const [duplicate, setDuplicate] = useState<{ message: string; entryId?: string } | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState((defaultValues.lineItems?.length ?? 0) > 0);

  const form = useForm<SalesEntryFormInput, unknown, SalesEntryInput>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });
  const {
    fields: currencyFields,
    append: appendCurrency,
    remove: removeCurrency,
  } = useFieldArray({ control: form.control, name: "currencyAmounts" });

  const selectedBranchId = useWatch({ control: form.control, name: "branchId" });
  const products = branchProductsMap[selectedBranchId] ?? [];

  const watchedCurrencyAmounts = useWatch({ control: form.control, name: "currencyAmounts" }) ?? [];
  const rateByCode = new Map(currencies.map((c) => [c.code, c.rateToIls]));

  function previewIls(row: { currencyCode?: string; amountOriginal?: unknown } | undefined): number {
    if (!row) return 0;
    const rate = rateByCode.get(row.currencyCode ?? "") ?? 0;
    const amount = toNumber(row.amountOriginal);
    return Number.isFinite(amount) ? amount * rate : 0;
  }

  const grandTotal = watchedCurrencyAmounts.reduce(
    (sum: number, row) => sum + previewIls(row),
    0
  );

  const usedCurrencyCodes = new Set(
    watchedCurrencyAmounts.map((r) => r?.currencyCode).filter((c): c is string => !!c)
  );
  const availableToAdd = currencies.filter((c) => !usedCurrencyCodes.has(c.code));

  function optionsForRow(index: number) {
    const currentCode = watchedCurrencyAmounts[index]?.currencyCode;
    return currencies.filter((c) => c.code === currentCode || !usedCurrencyCodes.has(c.code));
  }

  function onSubmit(values: SalesEntryInput) {
    setDuplicate(null);
    startTransition(async () => {
      const result =
        mode === "create" ? await createSalesEntry(values) : await updateSalesEntry(entryId!, values);

      if (!result.ok) {
        if (result.duplicateEntryId) {
          setDuplicate({ message: result.error, entryId: result.duplicateEntryId });
        } else {
          toast.error(result.error);
        }
        return;
      }

      playSaved();
      toast.success(mode === "create" ? "Sales entry saved." : "Sales entry updated.");
      router.push("/sales");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isOwner ? (
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

        <div className="space-y-3">
          <Label className="text-base">Sales by Currency</Label>

          {currencyFields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-lg border border-input p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-[6.5rem_1fr] gap-2">
                  <FormField
                    control={form.control}
                    name={`currencyAmounts.${index}.currencyCode`}
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-11 w-full text-base">
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {optionsForRow(index).map((c) => (
                              <SelectItem key={c.code} value={c.code} className="text-base">
                                {c.code}
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
                    name={`currencyAmounts.${index}.amountOriginal`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="h-11 text-base"
                            {...field}
                            value={field.value as number | string}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCurrency(index)}
                  disabled={currencyFields.length === 1}
                  aria-label="Remove currency"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                ≈ {formatIls(previewIls(watchedCurrencyAmounts[index]), true)}
              </p>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={availableToAdd.length === 0}
            onClick={() =>
              appendCurrency({
                currencyCode: availableToAdd[0]?.code ?? "",
                amountOriginal: "" as unknown as number,
              })
            }
          >
            <Plus className="size-4" />
            Add currency
          </Button>

          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
            <span className="text-2xl font-semibold tracking-tight text-primary">
              {formatIls(grandTotal)}
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="orderCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Orders</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  placeholder="0"
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

        {duplicate && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="text-destructive">{duplicate.message}</p>
            {duplicate.entryId && (
              <Link
                href={`/sales/${duplicate.entryId}/edit`}
                className="font-medium text-primary hover:underline"
              >
                Edit the existing entry →
              </Link>
            )}
          </div>
        )}

        <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-center justify-between p-4 text-left">
                <div>
                  <p className="font-medium">Product breakdown</p>
                  <p className="text-sm text-muted-foreground">
                    Optional — break down the total by product
                  </p>
                </div>
                <ChevronDown
                  className={cn("size-5 shrink-0 transition-transform", breakdownOpen && "rotate-180")}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No products added yet.</p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.productId`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          {index === 0 && <FormLabel>Product</FormLabel>}
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-11 w-full">
                                <SelectValue placeholder="Product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
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
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="w-20">
                          {index === 0 && <FormLabel>Qty</FormLabel>}
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="1"
                              className="h-11"
                              {...field}
                              value={field.value as number | string}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      aria-label="Remove product"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ productId: "", quantity: 1 })}
                  disabled={products.length === 0}
                  className="w-full"
                >
                  <Plus className="size-4" />
                  Add product
                </Button>
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No products are configured for this branch yet.
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Save entry" : "Update entry"}
        </Button>
      </form>
    </Form>
  );
}
