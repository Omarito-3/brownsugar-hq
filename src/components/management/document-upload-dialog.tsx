"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  documentSchema,
  documentCategoryValues,
  type DocumentInput,
  type DocumentFormInput,
} from "@/lib/validations/management";
import { createDocument } from "@/lib/actions/documents";
import { uploadDocumentFile } from "@/lib/actions/upload";
import { documentCategoryLabel } from "@/lib/management-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function DocumentUploadDialog({
  branches,
  isOwner,
  defaultBranchId,
}: {
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const router = useRouter();
  const t = useTranslations("management");
  const tRoot = useTranslations();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const initialValues: DocumentFormInput = {
    title: "",
    category: "CONTRACT",
    branchId: isOwner ? "" : defaultBranchId,
    fileUrl: "",
    expiryDate: "",
    notes: "",
  };

  const form = useForm<DocumentFormInput, unknown, DocumentInput>({
    resolver: zodResolver(documentSchema(t)),
    defaultValues: initialValues,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(initialValues);
      setFileName("");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDocumentFile(formData);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    form.setValue("fileUrl", result.url, { shouldValidate: true });
    setFileName(file.name);
  }

  async function onSubmit(values: DocumentInput) {
    setIsPending(true);
    const result = await createDocument(values);
    setIsPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t("documentForm.savedToast"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t("uploadDocument")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("documentForm.addTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documentForm.title")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("documentForm.titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documentForm.category")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("documentForm.selectCategory")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentCategoryValues.map((c) => (
                        <SelectItem key={c} value={c}>
                          {documentCategoryLabel(tRoot, c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOwner && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("documentForm.branch")}</FormLabel>
                    <Select
                      value={field.value || "ALL"}
                      onValueChange={(v) => field.onChange(v === "ALL" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("documentForm.selectBranch")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">{t("documentForm.allBranchesOption")}</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="fileUrl"
              render={() => (
                <FormItem>
                  <FormLabel>{t("documentForm.file")}</FormLabel>
                  <FormControl>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Paperclip className="size-4" />
                        )}
                        {uploading ? t("documentForm.uploading") : (fileName || t("documentForm.chooseFile"))}
                      </Button>
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documentForm.expiryDateOptional")}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documentForm.notesOptional")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending || uploading}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("documentForm.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
