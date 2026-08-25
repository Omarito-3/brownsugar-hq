"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, ImageIcon, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { FileLink, isPreviewableImage } from "@/components/shared/file-link";

import { documentCategoryValues } from "@/lib/validations/management";
import { deleteDocument } from "@/lib/actions/documents";
import { documentCategoryLabel } from "@/lib/management-labels";
import { formatDate } from "@/lib/format";
import type { DocumentRow } from "@/lib/queries/management";
import { DocumentUploadDialog } from "@/components/management/document-upload-dialog";
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
const EXPIRY_WARNING_DAYS = 30;

function expiryBadge(
  expiryDate: string | null,
  t: ReturnType<typeof useTranslations<"management">>
): React.ReactNode {
  if (!expiryDate) return <span className="text-muted-foreground">{t("noExpiry")}</span>;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
  const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / 86400000);

  if (daysUntil < 0) {
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        {t("expired")}
      </Badge>
    );
  }
  if (daysUntil <= EXPIRY_WARNING_DAYS) {
    return (
      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500">
        {t("expiringSoon")}
      </Badge>
    );
  }
  return null;
}

function DocumentRowActions({ document }: { document: DocumentRow }) {
  const t = useTranslations("management");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocument(document.id);
      if (result.ok) {
        toast.success(t("documentDeleted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("deleteDocAria", { title: document.title })}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteDocTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDocDescription", { title: document.title })}
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
  );
}

export function DocumentsSection({
  documents,
  branches,
  isOwner,
  defaultBranchId,
}: {
  documents: DocumentRow[];
  branches: BranchOption[];
  isOwner: boolean;
  defaultBranchId: string;
}) {
  const t = useTranslations("management");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const filtered = useMemo(
    () => documents.filter((d) => categoryFilter === ALL || d.category === categoryFilter),
    [documents, categoryFilter]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t("documentsHeading")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allCategories")}</SelectItem>
              {documentCategoryValues.map((c) => (
                <SelectItem key={c} value={c}>
                  {documentCategoryLabel(tRoot, c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DocumentUploadDialog branches={branches} isOwner={isOwner} defaultBranchId={defaultBranchId} />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noDocuments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnTitle")}</TableHead>
                  <TableHead>{t("columnCategory")}</TableHead>
                  <TableHead>{t("columnBranch")}</TableHead>
                  <TableHead>{t("columnExpiry")}</TableHead>
                  <TableHead className="text-end">{t("columnActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <FileLink
                        url={doc.fileUrl}
                        label={t("viewFileAria", { title: doc.title })}
                        className="min-h-10 py-2 text-primary hover:underline"
                      >
                        {isPreviewableImage(doc.fileUrl) ? (
                          <ImageIcon className="size-4 shrink-0" />
                        ) : (
                          <FileText className="size-4 shrink-0" />
                        )}
                        {doc.title}
                      </FileLink>
                    </TableCell>
                    <TableCell>{documentCategoryLabel(tRoot, doc.category)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.branchName ?? t("allBranches")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.expiryDate && (
                          <span className="text-muted-foreground">
                            {formatDate(doc.expiryDate, locale)}
                          </span>
                        )}
                        {expiryBadge(doc.expiryDate, t)}
                      </div>
                    </TableCell>
                    <TableCell className="p-1 text-end">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button asChild variant="ghost" size="icon-sm">
                          <FileLink
                            url={doc.fileUrl}
                            label={t("viewFileAria", { title: doc.title })}
                          >
                            <ExternalLink className="size-4" />
                          </FileLink>
                        </Button>
                        <DocumentRowActions document={doc} />
                      </div>
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
