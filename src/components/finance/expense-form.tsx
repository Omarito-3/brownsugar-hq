"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  expenseSchema,
  expenseCategoryValues,
  type ExpenseInput,
  type ExpenseFormInput,
} from "@/lib/validations/finance";
import { createExpense, updateExpense } from "@/lib/actions/finance";
import { useSound } from "@/hooks/use-sound";
import { todayDateKey, formatIls, toNumber } from "@/lib/format";
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
import { ReceiptUpload } from "@/components/finance/receipt-upload";

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Rent",
  SUPPLIES: "Supplies",
  SALARY: "Salary",
  MARKETING: "Marketing",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

const categories = expenseCategoryValues;

type BranchOption = { id: string; name: string };
type CurrencyOption = { code: string; rateToIls: number };

export function ExpenseForm({
  mode,
  expenseId,
  branches,
  currencies,
  isOwner,
  defaultValues,
}: {
  mode: "create" | "edit";
  expenseId?: string;
  branches: BranchOption[];
  currencies: CurrencyOption[];
  isOwner: boolean;
  defaultValues: ExpenseFormInput;
}) {
  const router = useRouter();
  const playSaved = useSound("saved");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExpenseFormInput, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const currencyCode = useWatch({ control: form.control, name: "currencyCode" });
  const amountOriginal = useWatch({ control: form.control, name: "amountOriginal" });
  const rate = currencies.find((c) => c.code === currencyCode)?.rateToIls ?? 0;
  const previewIls = toNumber(amountOriginal) * rate;

  function onSubmit(values: ExpenseInput) {
    startTransition(async () => {
      const result =
        mode === "create" ? await createExpense(values) : await updateExpense(expenseId!, values);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      playSaved();
      toast.success(mode === "create" ? "Expense saved." : "Expense updated.");
      router.push("/finance");
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

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-base">
                      {CATEGORY_LABELS[c] ?? c}
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
            name="amountOriginal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Amount</FormLabel>
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
            name="currencyCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Currency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencies.map((c) => (
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
        </div>

        {currencyCode && currencyCode !== "ILS" && (
          <p className="text-sm text-muted-foreground">≈ {formatIls(previewIls, true)}</p>
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

        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Receipt (optional)</FormLabel>
              <FormControl>
                <ReceiptUpload value={field.value ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Save expense" : "Update expense"}
        </Button>
      </form>
    </Form>
  );
}
