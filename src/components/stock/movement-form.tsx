"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import {
  movementSchema,
  movementTypeValues,
  adjustmentDirectionValues,
  type MovementInput,
  type MovementFormInput,
} from "@/lib/validations/stock";
import { recordMovement } from "@/lib/actions/stock";
import { useSound } from "@/hooks/use-sound";
import { todayDateKey, formatIls, localizedName } from "@/lib/format";
import { unitLabel, movementTypeLabel, adjustmentDirectionLabel } from "@/lib/stock-labels";
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

type LocationOption = { id: string; name: string; nameAr: string | null; type: string };
type ItemOption = { id: string; name: string; nameAr: string | null; unit: string };
type SupplierOption = { id: string; name: string };

export function MovementForm({
  locations,
  items,
  suppliers,
  isOwner,
  defaultLocationId,
}: {
  locations: LocationOption[];
  items: ItemOption[];
  suppliers: SupplierOption[];
  isOwner: boolean;
  defaultLocationId: string;
}) {
  const router = useRouter();
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const playSaved = useSound("saved");
  const [isPending, startTransition] = useTransition();

  const availableTypes = isOwner
    ? movementTypeValues
    : movementTypeValues.filter((mt) => mt !== "TRANSFER");

  const defaultValues: MovementFormInput = {
    type: "PURCHASE",
    locationId: defaultLocationId,
    fromLocationId: "",
    toLocationId: "",
    stockItemId: "",
    quantity: "",
    date: todayDateKey(),
    supplierId: "",
    costIls: "",
    direction: "",
    notes: "",
  };

  const form = useForm<MovementFormInput, unknown, MovementInput>({
    resolver: zodResolver(movementSchema(t)),
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
        toast.success(t("form.expenseAutoLogged", { amount: formatIls(result.expenseCreated) }));
      } else {
        toast.success(t("form.savedToast"));
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
              <FormLabel className="text-base">{t("form.movementType")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder={t("form.selectType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTypes.map((mt) => (
                    <SelectItem key={mt} value={mt} className="text-base">
                      {movementTypeLabel(tRoot, mt)}
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
              name="fromLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">{t("form.fromBranch")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full text-base">
                        <SelectValue placeholder={t("form.from")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-base">
                          {localizedName(b.name, b.nameAr, locale)}
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
              name="toLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">{t("form.toBranch")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full text-base">
                        <SelectValue placeholder={t("form.to")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-base">
                          {localizedName(b.name, b.nameAr, locale)}
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
            name="locationId"
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
                    {locations.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-base">
                        {localizedName(b.name, b.nameAr, locale)}
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
              {localizedName(locations[0]?.name ?? "", locations[0]?.nameAr ?? null, locale) || tCommon("noBranchAssigned")}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="stockItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">{t("form.item")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-12 w-full text-base">
                    <SelectValue placeholder={t("form.selectItem")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-base">
                      {localizedName(i.name, i.nameAr, locale)}
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
                  {t("form.quantity")}
                  {selectedItem && (
                    <span className="text-muted-foreground"> ({unitLabel(tRoot, selectedItem.unit)})</span>
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
                <FormLabel className="text-base">{t("form.date")}</FormLabel>
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
                <FormLabel className="text-base">{t("form.direction")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full text-base">
                      <SelectValue placeholder={t("form.selectDirection")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {adjustmentDirectionValues.map((d) => (
                      <SelectItem key={d} value={d} className="text-base">
                        {adjustmentDirectionLabel(tRoot, d)}
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
                    <FormLabel className="text-base">{t("form.supplierOptional")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-12 w-full text-base">
                          <SelectValue placeholder={t("form.selectSupplier")} />
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
                    <FormLabel className="text-base">{t("form.costOptional")}</FormLabel>
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
            <p className="text-xs text-muted-foreground">{t("form.autoExpenseNote")}</p>
          </>
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

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {t("form.saveMovement")}
        </Button>
      </form>
    </Form>
  );
}
