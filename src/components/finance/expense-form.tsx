"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const playSaved = useSound("saved");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ExpenseFormInput, unknown, ExpenseInput>({
    resolver: zodResolver(expenseSchema(t)),
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
      toast.success(mode === "create" ? t("form.savedToast") : t("form.updatedToast"));
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
                <FormLabel className="text-base">{t("form.branch")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder={t("form.selectBranch")} />
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
            <Label className="text-base">{t("form.branch")}</Label>
            <div className="mt-2 flex h-12 items-center rounded-md border border-input bg-muted px-3 text-base">
              {branches[0]?.name ?? tCommon("noBranchAssigned")}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">{t("form.date")}</FormLabel>
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
              <FormLabel className="text-base">{t("form.category")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder={t("form.selectCategory")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-base">
                      {t(`categories.${c}`)}
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
                <FormLabel className="text-base">{t("form.amount")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder={t("form.amountPlaceholder")}
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
                <FormLabel className="text-base">{t("form.currency")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder={t("form.currencyPlaceholder")} />
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
              <FormLabel className="text-base">{t("form.notesOptional")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  className="text-base"
                  placeholder={t("form.notesPlaceholder")}
                  {...field}
                />
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
              <FormLabel className="text-base">{t("form.receiptOptional")}</FormLabel>
              <FormControl>
                <ReceiptUpload value={field.value ?? ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? t("form.saveExpense") : t("form.updateExpense")}
        </Button>
      </form>
    </Form>
  );
}
