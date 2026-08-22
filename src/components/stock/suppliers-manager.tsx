"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { supplierSchema, type SupplierInput } from "@/lib/validations/stock-items";
import {
  createSupplier,
  updateSupplier,
  setSupplierActive,
  deleteSupplier,
} from "@/lib/actions/suppliers";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  isActive: boolean;
};

function CreateSupplierForm() {
  const t = useTranslations("stock");
  const [isPending, startTransition] = useTransition();
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema(t)),
    defaultValues: { name: "", phone: "", notes: "" },
  });

  function onSubmit(values: SupplierInput) {
    startTransition(async () => {
      const result = await createSupplier(values);
      if (result.ok) {
        toast.success(t("suppliersPage.supplierCreated"));
        form.reset({ name: "", phone: "", notes: "" });
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("suppliersPage.name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("suppliersPage.namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("suppliersPage.phoneOptional")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            <Plus className="size-4" />
            {t("suppliersPage.addSupplierButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SupplierRowItem({ supplier }: { supplier: SupplierRow }) {
  const t = useTranslations("stock");
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone);
  const [isPending, startTransition] = useTransition();

  const changed = name !== supplier.name || phone !== supplier.phone;

  function handleSave() {
    startTransition(async () => {
      const result = await updateSupplier(supplier.id, { name, phone, notes: supplier.notes });
      if (result.ok) toast.success(t("suppliersPage.supplierUpdated"));
      else toast.error(result.error);
    });
  }

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await setSupplierActive(supplier.id, checked);
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id);
      if (result.ok) toast.success(t("suppliersPage.supplierDeleted"));
      else toast.error(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 min-w-32" />
      </TableCell>
      <TableCell>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 min-w-28" />
      </TableCell>
      <TableCell>
        <Switch checked={supplier.isActive} onCheckedChange={handleToggleActive} disabled={isPending} />
      </TableCell>
      <TableCell className="text-end">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={handleSave} disabled={!changed || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("suppliersPage.save")}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive hover:text-destructive"
            aria-label={t("suppliersPage.deleteAria", { name: supplier.name })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function SuppliersManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const t = useTranslations("stock.suppliersPage");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("addSupplierCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSupplierForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("suppliersCard")}</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noSuppliersYet")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnName")}</TableHead>
                    <TableHead>{t("columnPhone")}</TableHead>
                    <TableHead>{t("columnActive")}</TableHead>
                    <TableHead className="text-end">{t("columnActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <SupplierRowItem key={supplier.id} supplier={supplier} />
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
