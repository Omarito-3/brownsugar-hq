"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { deleteMenuExperiment } from "@/lib/actions/menu-experiments";
import { experimentStatusLabel } from "@/lib/marketing-labels";
import type { ExperimentRow } from "@/lib/queries/marketing";
import { ExperimentFormDialog } from "@/components/marketing/experiment-form-dialog";
import { Button } from "@/components/ui/button";
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

type BranchOption = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  IDEA: "border-border bg-muted text-muted-foreground",
  TESTING: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  LAUNCHED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  REJECTED: "border-destructive/40 bg-destructive/10 text-destructive",
};

function ExperimentRowActions({
  experiment,
  branches,
  isOwner,
  defaultBranchId,
}: {
  experiment: ExperimentRow;
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteMenuExperiment(experiment.id);
      if (result.ok) {
        toast.success(t("experimentDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ExperimentFormDialog
        mode="edit"
        experimentId={experiment.id}
        branches={branches}
        isOwner={isOwner}
        defaultBranchId={defaultBranchId}
        defaultValues={{
          productName: experiment.productName,
          notes: experiment.notes,
          status: experiment.status as "IDEA" | "TESTING" | "LAUNCHED" | "REJECTED",
          branchId: experiment.branchId ?? "",
        }}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("editExperimentAria", { product: experiment.productName })}
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteExperimentAria", { product: experiment.productName })}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExperimentTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteExperimentDescription", { product: experiment.productName })}
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
    </div>
  );
}

export function ExperimentsTable({
  experiments,
  branches,
  isOwner,
  defaultBranchId,
}: {
  experiments: ExperimentRow[];
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("marketing");
  const tRoot = useTranslations();
  const tManagement = useTranslations("management");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t("experimentsHeading")}</CardTitle>
        <ExperimentFormDialog
          mode="create"
          branches={branches}
          isOwner={isOwner}
          defaultBranchId={defaultBranchId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              {t("addExperiment")}
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {experiments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noExperiments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnProduct")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnBranch")}</TableHead>
                  <TableHead className="text-end">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((experiment) => (
                  <TableRow key={experiment.id}>
                    <TableCell className="font-medium">
                      <div>{experiment.productName}</div>
                      <div className="text-xs text-muted-foreground">{experiment.notes}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[experiment.status]}>
                        {experimentStatusLabel(tRoot, experiment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {experiment.branchName ?? tManagement("allBranches")}
                    </TableCell>
                    <TableCell className="p-1">
                      <ExperimentRowActions
                        experiment={experiment}
                        branches={branches}
                        isOwner={isOwner}
                        defaultBranchId={defaultBranchId}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
