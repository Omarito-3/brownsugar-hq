"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { positionValues } from "@/lib/validations/employees";
import { deleteEmployee, setEmployeeActive } from "@/lib/actions/employees";
import { positionLabel } from "@/lib/employee-labels";
import { formatDate, formatIls } from "@/lib/format";
import type { EmployeeRow } from "@/lib/queries/employees";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { Button } from "@/components/ui/button";
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

const ALL = "ALL";

function EmployeeRowActions({
  employee,
  branches,
  isOwner,
  showSalary,
}: {
  employee: EmployeeRow;
  branches: BranchOption[];
  isOwner: boolean;
  showSalary: boolean;
}) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await setEmployeeActive(employee.id, checked);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmployee(employee.id);
      if (result.ok) {
        toast.success(t("employeeDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Switch
        checked={employee.isActive}
        onCheckedChange={handleToggleActive}
        disabled={isPending}
        aria-label={employee.name}
      />
      <EmployeeFormDialog
        mode="edit"
        employeeId={employee.id}
        branches={branches}
        isOwner={isOwner}
        showSalary={showSalary}
        defaultBranchId={employee.branchId}
        defaultValues={{
          name: employee.name,
          phone: employee.phone ?? "",
          branchId: employee.branchId,
          position: employee.position as (typeof positionValues)[number],
          ...(showSalary && employee.salaryIls != null ? { salaryIls: employee.salaryIls } : {}),
          startDate: employee.startDate,
          notes: employee.notes ?? "",
        }}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t("editAria", { name: employee.name })}>
            <Pencil className="size-4" />
          </Button>
        }
      />

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteAria", { name: employee.name })}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: employee.name })}
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

export function EmployeesTable({
  employees,
  branches,
  isOwner,
  showSalary,
  canManage,
  defaultBranchId,
}: {
  employees: EmployeeRow[];
  branches: BranchOption[];
  isOwner: boolean;
  showSalary: boolean;
  canManage: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("employees");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [branchFilter, setBranchFilter] = useState(ALL);
  const [positionFilter, setPositionFilter] = useState(ALL);

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          (branchFilter === ALL || e.branchId === branchFilter) &&
          (positionFilter === ALL || e.position === positionFilter)
      ),
    [employees, branchFilter, positionFilter]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("tableTitle")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allPositions")}</SelectItem>
              {positionValues.map((p) => (
                <SelectItem key={p} value={p}>
                  {positionLabel(tRoot, p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <EmployeeFormDialog
              mode="create"
              branches={branches}
              isOwner={isOwner}
              showSalary={showSalary}
              defaultBranchId={defaultBranchId}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" />
                  {t("addEmployee")}
                </Button>
              }
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noEmployeesYet")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead>{t("columnBranch")}</TableHead>
                  <TableHead>{t("columnPosition")}</TableHead>
                  {showSalary && <TableHead className="text-end">{t("columnSalary")}</TableHead>}
                  <TableHead>{t("columnStartDate")}</TableHead>
                  {canManage && <TableHead className="text-end">{t("columnActions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow key={employee.id} className={employee.isActive ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.branchName}</TableCell>
                    <TableCell>{positionLabel(tRoot, employee.position)}</TableCell>
                    {showSalary && (
                      <TableCell className="text-end tabular-nums">
                        {formatIls(employee.salaryIls)}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {formatDate(employee.startDate, locale)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="p-1">
                        <EmployeeRowActions
                          employee={employee}
                          branches={branches}
                          isOwner={isOwner}
                          showSalary={showSalary}
                        />
                      </TableCell>
                    )}
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
