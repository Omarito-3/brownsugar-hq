import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Opens a stored file through the authenticated `/api/files` route.
 *
 * Blob storage is private, so these URLs are not directly fetchable — the route
 * authenticates the request and authorizes it against the record that owns the
 * file. Opening in a new tab keeps any unsaved form state intact, which matters
 * on the expense edit page where the receipt sits inside the form.
 */
export function FileLink({
  url,
  label,
  className,
  children,
}: {
  url: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  );
}

/** Files we can show as an inline thumbnail; everything else gets a file icon. */
export function isPreviewableImage(url: string): boolean {
  return /\.(jpe?g|png|webp|heic|gif|avif)(\?|$)/i.test(url);
}
