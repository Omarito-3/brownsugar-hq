"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { setLocationMinimum } from "@/lib/actions/stock";
import { unitLabel } from "@/lib/stock-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function MinimumEditorDialog({
  locationId,
  locationName,
  itemId,
  itemName,
  unit,
  currentQuantity,
  /** The stored per-location minimum; 0 means "no override". */
  minimum,
  /** The item-level lowStockThreshold used when there's no override. */
  itemDefault,
  trigger,
}: {
  locationId: string;
  locationName: string;
  itemId: string;
  itemName: string;
  unit: string;
  currentQuantity: number;
  minimum: number;
  itemDefault: number;
  trigger: React.ReactNode;
}) {
  const t = useTranslations("stock");
  const tRoot = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(minimum));
  const [isPending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setValue(String(minimum));
  }

  const parsed = Number(value);
  const isValid = Number.isFinite(parsed) && parsed >= 0;
  const isOverride = isValid && parsed > 0;
  const effective = isOverride ? parsed : itemDefault;
  const u = unitLabel(tRoot, unit);

  function handleSave() {
    if (!isValid) return;
    startTransition(async () => {
      const result = await setLocationMinimum(locationId, itemId, parsed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("minimumEditor.savedToast"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("minimumEditor.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("minimumEditor.dialogSubtitle", { item: itemName, location: locationName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("minimumEditor.currentQuantity")}</span>
            <span className="font-medium tabular-nums">
              {currentQuantity} {u}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimum-input">{t("minimumEditor.minimumLabel")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="minimum-input"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isOverride || isPending}
                onClick={() => setValue("0")}
              >
                {t("minimumEditor.useDefault")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("minimumEditor.helper", { default: `${itemDefault} ${u}` })}
            </p>
          </div>

          <div className="rounded-lg border border-border px-3 py-2 text-xs">
            <p className={isOverride ? "font-medium text-primary" : "text-muted-foreground"}>
              {isOverride ? t("minimumEditor.sourceOverride") : t("minimumEditor.sourceFallback")}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {t("minimumEditor.effective", { value: `${effective} ${u}` })}
            </p>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("minimumEditor.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
