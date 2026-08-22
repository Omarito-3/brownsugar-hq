"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadReceipt } from "@/lib/actions/upload";

export function ReceiptUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- locally-served runtime upload, not a build-time asset
            <img src={value} alt="Receipt preview" className="size-14 rounded-md object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-md bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </span>
          )}
          <div className="flex-1 truncate text-sm text-muted-foreground">Receipt attached</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            aria-label="Remove receipt"
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
          {uploading ? "Uploading…" : "Attach receipt photo"}
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
