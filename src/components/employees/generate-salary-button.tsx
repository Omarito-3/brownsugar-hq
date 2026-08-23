"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { generateSalaryExpenses } from "@/lib/actions/salary";
import { toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GenerateSalaryButton() {
  const t = useTranslations("employees.salary");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(toDateKey(new Date()).slice(0, 7));
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateSalaryExpenses({ month });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("resultSummary", { created: result.created, skipped: result.skipped }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wallet className="size-4" />
          {t("generateButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="salary-month">{t("monthLabel")}</Label>
          <Input
            id="salary-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t("generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
