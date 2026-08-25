"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";

import { auth } from "@/auth";

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

/**
 * Stores uploads in Vercel Blob with **private** access.
 *
 * Vercel's filesystem is ephemeral, so receipts and documents can't live in
 * public/. They go to Blob instead, and because the store is private the blob
 * URL is not directly fetchable — reads are proxied through /api/files, which
 * checks the session and the caller's role against the record that owns the
 * file. That's stricter than a public store, where anyone holding the URL could
 * read it.
 *
 * The uploader's id is part of the pathname so a just-uploaded file (not yet
 * attached to an expense or document) can still be previewed by the person who
 * uploaded it, and only by them. See the serving route for that rule.
 *
 * The DB stores the /api/files/... path, so the schema is unchanged — these
 * fields always held a URL string.
 */
async function storeUpload(formData: FormData, folder: string): Promise<UploadResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPG, PNG, WEBP, HEIC, or PDF files are supported." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File is too large (max 5MB)." };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Surfaced rather than swallowed: without the token every upload would fail
    // at the network layer with a much less obvious message.
    return { ok: false, error: "File storage is not configured." };
  }

  const ext = path.extname(file.name).toLowerCase();
  const pathname = `${folder}/${session.user.id}/${randomUUID()}${ext}`;

  try {
    await put(pathname, file, {
      access: "private",
      contentType: file.type,
      // The pathname is already unique; without this Blob adds a second suffix,
      // which would break the exact-match lookup done by the serving route.
      addRandomSuffix: false,
    });
    return { ok: true, url: `/api/files/${pathname}` };
  } catch (err) {
    console.error("[upload] blob put failed:", err);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}

export async function uploadReceipt(formData: FormData): Promise<UploadResult> {
  return storeUpload(formData, "receipts");
}

export async function uploadDocumentFile(formData: FormData): Promise<UploadResult> {
  return storeUpload(formData, "documents");
}
