"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  stockItemSchema,
  unitValues,
  type StockItemInput,
  type StockItemFormInput,
} from "@/lib/validations/stock-items";
import {
  createStockItem,
  updateStockItem,
  setStockItemActive,
  deleteStockItem,
} from "@/lib/actions/stock-items";
import { unitLabel } from "@/lib/stock-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type StockItemRow = {
  id: string;
  name: string;
  nameAr: string;
  unit: (typeof unitValues)[number];
  lowStockThreshold: number;
  isActive: boolean;
};

function CreateItemForm() {
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const [isPending, startTransition] = useTransition();
  const form = useForm<StockItemFormInput, unknown, StockItemInput>({
    resolver: zodResolver(stockItemSchema(t)),
    defaultValues: { name: "", nameAr: "", unit: "PIECE", lowStockThreshold: "" },
  });

  function onSubmit(values: StockItemInput) {
    startTransition(async () => {
      const result = await createStockItem(values);
      if (result.ok) {
        toast.success(t("itemsPage.itemCreated"));
        form.reset({ name: "", nameAr: "", unit: "PIECE", lowStockThreshold: "" });
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("itemsPage.name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("itemsPage.namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nameAr"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("itemsPage.nameArLabel")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("itemsPage.unit")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unitValues.map((u) => (
                    <SelectItem key={u} value={u}>
                      {unitLabel(tRoot, u)}
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
          name="lowStockThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("itemsPage.lowStockThreshold")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  value={field.value as number | string}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            <Plus className="size-4" />
            {t("itemsPage.addItemButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ItemRow({ item }: { item: StockItemRow }) {
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const [name, setName] = useState(item.name);
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold));
  const [isPending, startTransition] = useTransition();

  const changed = name !== item.name || threshold !== String(item.lowStockThreshold);

  function handleSave() {
    startTransition(async () => {
      const result = await updateStockItem(item.id, {
        name,
        nameAr: item.nameAr,
        unit: item.unit,
        lowStockThreshold: Number(threshold),
      });
      if (result.ok) toast.success(t("itemsPage.itemUpdated"));
      else toast.error(result.error);
    });
  }

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await setStockItemActive(item.id, checked);
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStockItem(item.id);
      if (result.ok) toast.success(t("itemsPage.itemDeleted"));
      else toast.error(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 min-w-32" />
      </TableCell>
      <TableCell className="text-muted-foreground">{unitLabel(tRoot, item.unit)}</TableCell>
      <TableCell>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="h-9 w-28"
        />
      </TableCell>
      <TableCell>
        <Switch checked={item.isActive} onCheckedChange={handleToggleActive} disabled={isPending} />
      </TableCell>
      <TableCell className="text-end">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={handleSave} disabled={!changed || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("itemsPage.save")}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive hover:text-destructive"
            aria-label={t("itemsPage.deleteAria", { name: item.name })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ItemsManager({ items }: { items: StockItemRow[] }) {
  const t = useTranslations("stock.itemsPage");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("addItemCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateItemForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("stockItemsCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noItemsYet")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnName")}</TableHead>
                    <TableHead>{t("columnUnit")}</TableHead>
                    <TableHead>{t("columnThreshold")}</TableHead>
                    <TableHead>{t("columnActive")}</TableHead>
                    <TableHead className="text-end">{t("columnActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
