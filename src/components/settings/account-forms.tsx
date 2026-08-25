"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  profileSchema,
  changePasswordSchema,
  MIN_PASSWORD_LENGTH,
  type ProfileInput,
  type ChangePasswordInput,
} from "@/lib/validations/account";
import { updateOwnProfile, changeOwnPassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type Profile = {
  name: string;
  email: string;
  role: string;
  branchName: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("account");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema(t)),
    defaultValues: { name: profile.name },
  });

  async function onSubmit(values: ProfileInput) {
    setIsPending(true);
    const result = await updateOwnProfile(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("profileSaved"));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profileHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("email")}</Label>
            <div className="mt-2 flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
              {profile.email}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
          <div>
            <Label>{t("role")}</Label>
            <div className="mt-2 flex h-10 items-center gap-2 rounded-md border border-input bg-muted px-3 text-sm">
              <Badge variant="secondary">
                {tRoles(profile.role as "OWNER" | "MANAGER" | "STAFF")}
              </Badge>
              <span className="text-muted-foreground">
                {profile.branchName ?? t("allBranches")}
              </span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input className="h-11 text-base" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("saveProfile")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema(t)),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setIsPending(true);
    const result = await changeOwnPassword(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("passwordSaved"));
    form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("passwordHeading")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("currentPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      className="h-11 text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-11 text-base"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("passwordHint", { min: MIN_PASSWORD_LENGTH })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        className="h-11 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("savePassword")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
