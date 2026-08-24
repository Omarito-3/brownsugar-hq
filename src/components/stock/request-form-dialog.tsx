"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import {
  stockRequestSchema,
  type StockRequestInput,
  type StockRequestFormInput,
} from "@/lib/validations/stock";
import { createStockRequest } from "@/lib/actions/stock-requests";
import { localizedName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type LocationOption = { id: string; name: string; nameAr: string | null };
type ItemOption = { id: string; name: string; nameAr: string | null; unit: string };

export function RequestFormDialog({
  requestableLocations,
  warehouses,
  items,
  defaultRequestingLocationId,
}: {
  requestableLocations: LocationOption[];
  warehouses: LocationOption[];
  items: ItemOption[];
  defaultRequestingLocationId: string;
}) {
  const router = useRouter();
  const t = useTranslations("stock");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: StockRequestFormInput = {
    requestingLocationId: defaultRequestingLocationId,
    fulfillingLocationId: warehouses[0]?.id ?? "",
    notes: "",
    items: [{ stockItemId: "", quantityRequested: "" as unknown as number }],
  };

  const form = useForm<StockRequestFormInput, unknown, StockRequestInput>({
    resolver: zodResolver(stockRequestSchema(t)),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: StockRequestInput) {
    setIsPending(true);
    const result = await createStockRequest(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t("requestsPage.createdToast"));
    setOpen(false);
    router.refresh();
  }

  const singleRequestable = requestableLocations.length === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-12 text-base">
          <Plus className="size-4" />
          {t("requestsPage.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("requestsPage.newRequestTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            {singleRequestable ? (
              <div>
                <Label>{t("requestsPage.requestingLocation")}</Label>
                <div className="mt-2 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {localizedName(
                    requestableLocations[0].name,
                    requestableLocations[0].nameAr,
                    locale
                  )}
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="requestingLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requestsPage.requestingLocation")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("requestsPage.selectRequesting")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {requestableLocations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {localizedName(l.name, l.nameAr, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="fulfillingLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requestsPage.fulfillingLocation")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("requestsPage.selectFulfilling")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {localizedName(w.name, w.nameAr, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label>{t("requestsPage.itemsHeading")}</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.stockItemId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("requestsPage.selectItem")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {localizedName(i.name, i.nameAr, locale)}
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
                    name={`items.${index}.quantityRequested`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder={t("requestsPage.quantity")}
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
                    disabled={fields.length === 1}
                    aria-label={t("requestsPage.removeItemAria")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ stockItemId: "", quantityRequested: "" as unknown as number })}
              >
                <Plus className="size-4" />
                {t("requestsPage.addItem")}
              </Button>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requestsPage.notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("requestsPage.notesPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending || warehouses.length === 0}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("requestsPage.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
