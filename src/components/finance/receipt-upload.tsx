"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { FileLink } from "@/components/shared/file-link";
import { Button } from "@/components/ui/button";
import { uploadReceipt } from "@/lib/actions/upload";

export function ReceiptUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("finance.form");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadReceipt(formData);
    setUploading(false);

    if (!result.ok) {
      toast.error(result.error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(result.url);
  }

  function handleRemove() {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const isImage = /\.(jpe?g|png|webp|heic)$/i.test(value);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-input p-3">
          <FileLink url={value} label={t("viewReceiptAria")} className="shrink-0">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- runtime Blob URL, not a build-time asset; next/image would need the Blob host in remotePatterns for no real benefit here
              <img
                src={value}
                alt={t("receiptAttached")}
                className="size-14 rounded-md object-cover transition-opacity hover:opacity-80"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-md bg-muted transition-colors hover:bg-muted/70">
                <FileText className="size-6 text-muted-foreground" />
              </span>
            )}
          </FileLink>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">{t("receiptAttached")}</p>
            <FileLink
              url={value}
              label={t("viewReceiptAria")}
              className="text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {t("viewReceipt")}
            </FileLink>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            aria-label={t("removeReceiptAria")}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full text-base"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          {uploading ? t("uploading") : t("attachReceipt")}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
