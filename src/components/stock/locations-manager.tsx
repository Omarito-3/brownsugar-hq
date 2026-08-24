"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Warehouse, Store } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { stockLocationSchema, type StockLocationInput } from "@/lib/validations/stock";
import {
  createWarehouse,
  updateStockLocation,
  setStockLocationActive,
  deleteStockLocation,
} from "@/lib/actions/stock-locations";
import { locationTypeLabel } from "@/lib/stock-labels";
import { localizedName } from "@/lib/format";
import type { StockLocationRow } from "@/lib/queries/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function LocationFormDialog({
  mode,
  locationId,
  defaultValues,
  trigger,
}: {
  mode: "create" | "edit";
  locationId?: string;
  defaultValues?: StockLocationInput;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("stock");
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initialValues: StockLocationInput = defaultValues ?? { name: "", nameAr: "" };

  const form = useForm<StockLocationInput>({
    resolver: zodResolver(stockLocationSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initialValues);
  }

  async function onSubmit(values: StockLocationInput) {
    setIsPending(true);
    const result =
      mode === "create" ? await createWarehouse(values) : await updateStockLocation(locationId!, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "create" ? t("locationsPage.created") : t("locationsPage.updated"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("locationsPage.addWarehouseTitle") : t("locationsPage.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("locationsPage.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("locationsPage.namePlaceholder")} {...field} />
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
                  <FormLabel>{t("locationsPage.nameArLabel")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("locationsPage.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LocationRow({ location }: { location: StockLocationRow }) {
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isBranch = location.type === "BRANCH";
  const Icon = isBranch ? Store : Warehouse;

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await setStockLocationActive(location.id, checked);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStockLocation(location.id);
      if (result.ok) {
        toast.success(t("locationsPage.deleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <TableRow className={location.isActive ? "" : "opacity-50"}>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {localizedName(location.name, location.nameAr, locale)}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{locationTypeLabel(tRoot, location.type)}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{location.branchName ?? tCommon("dash")}</TableCell>
      <TableCell>
        <Switch
          checked={location.isActive}
          onCheckedChange={handleToggleActive}
          disabled={isPending}
          aria-label={location.name}
        />
      </TableCell>
      <TableCell className="p-1">
        <div className="flex items-center justify-end gap-1">
          <LocationFormDialog
            mode="edit"
            locationId={location.id}
            defaultValues={{ name: location.name, nameAr: location.nameAr ?? "" }}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("locationsPage.editAria", { name: location.name })}
              >
                {tCommon("edit")}
              </Button>
            }
          />
          {!isBranch && (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("locationsPage.deleteAria", { name: location.name })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("locationsPage.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("locationsPage.deleteDescription", { name: location.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isPending}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    {tCommon("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function LocationsManager({ locations }: { locations: StockLocationRow[] }) {
  const t = useTranslations("stock");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("locationsPage.title")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("locationsPage.branchLocationNote")}</p>
        </div>
        <LocationFormDialog
          mode="create"
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              {t("locationsPage.addWarehouse")}
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("locationsPage.noLocations")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("locationsPage.columnName")}</TableHead>
                  <TableHead>{t("locationsPage.columnType")}</TableHead>
                  <TableHead>{t("locationsPage.columnBranch")}</TableHead>
                  <TableHead>{t("locationsPage.columnActive")}</TableHead>
                  <TableHead className="text-end">{t("locationsPage.columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => (
                  <LocationRow key={l.id} location={l} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
