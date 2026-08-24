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
 * Stores uploads in Vercel Blob.
 *
 * Vercel's filesystem is ephemeral — anything written to public/ is lost on the
 * next deploy — so receipts and documents go to Blob instead. The DB keeps
 * storing a plain URL string either way, so no schema change was needed.
 *
 * Blobs are public: the URL is unguessable (Blob appends a random suffix) but
 * anyone holding it can read the file. That matches how these are used —
 * receipt images shown inline in the app — but it does mean the URLs should be
 * treated as secrets-by-obscurity rather than access-controlled documents.
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
  const key = `${folder}/${randomUUID()}${ext}`;

  try {
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
      // The key is already unique; without this Blob would add a second suffix.
      addRandomSuffix: false,
    });
    return { ok: true, url: blob.url };
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
