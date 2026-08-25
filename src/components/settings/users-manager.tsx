"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  roleValues,
  MIN_PASSWORD_LENGTH,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput,
} from "@/lib/validations/account";
import { createUser, updateUser, resetUserPassword, setUserActive } from "@/lib/actions/users";
import type { ManagedUser } from "@/lib/queries/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type BranchOption = { id: string; name: string };

const NO_BRANCH = "NONE";

function RoleAndBranchFields({
  form: anyForm,
  branches,
}: {
  // Shared by the create and edit forms, whose field sets otherwise differ.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-hook-form's Control type can't be expressed generically across both shapes here
  form: any;
  branches: BranchOption[];
}) {
  const t = useTranslations("users");
  const tRoles = useTranslations("roles");
  const role = useWatch({ control: anyForm.control, name: "role" });
  const isOwnerRole = role === "OWNER";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={anyForm.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("role")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {roleValues.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tRoles(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={anyForm.control}
        name="branchId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("branch")}</FormLabel>
            <Select
              value={field.value || NO_BRANCH}
              onValueChange={(v) => field.onChange(v === NO_BRANCH ? "" : v)}
              disabled={isOwnerRole}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectBranch")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOwnerRole && (
              <p className="text-xs text-muted-foreground">{t("branchOwnerHint")}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function CreateUserDialog({ branches }: { branches: BranchOption[] }) {
  const t = useTranslations("users");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initial: CreateUserInput = {
    name: "",
    email: "",
    password: "",
    role: "STAFF",
    branchId: branches[0]?.id ?? "",
  };

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema(t)),
    defaultValues: initial,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initial);
  }

  async function onSubmit(values: CreateUserInput) {
    setIsPending(true);
    const result = await createUser(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("created"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t("addUser")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addUserTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <RoleAndBranchFields form={form} branches={branches} />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("create")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, branches }: { user: ManagedUser; branches: BranchOption[] }) {
  const t = useTranslations("users");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const initial: UpdateUserInput = {
    name: user.name,
    email: user.email,
    role: user.role as (typeof roleValues)[number],
    branchId: user.branchId ?? "",
  };

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema(t)),
    defaultValues: initial,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset(initial);
  }

  async function onSubmit(values: UpdateUserInput) {
    setIsPending(true);
    const result = await updateUser(user.id, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("updated"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("editAria", { name: user.name })}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editUserTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <RoleAndBranchFields form={form} branches={branches} />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user }: { user: ManagedUser }) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema(t)),
    defaultValues: { newPassword: "" },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) form.reset({ newPassword: "" });
  }

  async function onSubmit(values: ResetPasswordInput) {
    setIsPending(true);
    const result = await resetUserPassword(user.id, values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("passwordReset", { name: user.name }));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("resetAria", { name: user.name })}>
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("resetPasswordTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("newPassword")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("resetPassword")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({
  user,
  branches,
  currentUserId,
}: {
  user: ManagedUser;
  branches: BranchOption[];
  currentUserId: string;
}) {
  const t = useTranslations("users");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isSelf = user.id === currentUserId;

  function handleToggleActive(checked: boolean) {
    startTransition(async () => {
      const result = await setUserActive(user.id, checked);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        checked ? t("activated", { name: user.name }) : t("deactivated", { name: user.name })
      );
      router.refresh();
    });
  }

  return (
    <TableRow className={user.isActive ? "" : "opacity-50"}>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          {user.name}
          {isSelf && (
            <Badge variant="outline" className="text-[11px]">
              {t("youBadge")}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <Badge variant="secondary">{tRoles(user.role as "OWNER" | "MANAGER" | "STAFF")}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.branchName ?? "—"}</TableCell>
      <TableCell>
        <Switch
          checked={user.isActive}
          onCheckedChange={handleToggleActive}
          // Self-deactivation is refused server-side too; disabling here just
          // avoids offering an action that can only fail.
          disabled={isPending || isSelf}
          aria-label={t("activeAria", { name: user.name })}
        />
      </TableCell>
      <TableCell className="p-1">
        <div className="flex items-center justify-end gap-1">
          <EditUserDialog user={user} branches={branches} />
          <ResetPasswordDialog user={user} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function UsersManager({
  users,
  branches,
  currentUserId,
}: {
  users: ManagedUser[];
  branches: BranchOption[];
  currentUserId: string;
}) {
  const t = useTranslations("users");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <CreateUserDialog branches={branches} />
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noUsers")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead>{t("columnEmail")}</TableHead>
                  <TableHead>{t("columnRole")}</TableHead>
                  <TableHead>{t("columnBranch")}</TableHead>
                  <TableHead>{t("columnActive")}</TableHead>
                  <TableHead className="text-end">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} branches={branches} currentUserId={currentUserId} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
