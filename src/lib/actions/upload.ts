"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { auth } from "@/auth";

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);

/**
 * Stores receipt uploads under public/uploads for local development.
 * TODO: swap this for cloud object storage (e.g. S3/R2) at deploy time —
 * local disk storage does not survive redeploys on most hosts.
 */
export async function uploadReceipt(formData: FormData): Promise<UploadResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPG, PNG, WEBP, HEIC, or PDF receipts are supported." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File is too large (max 5MB)." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase() || "";
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);

  return { ok: true, url: `/uploads/${filename}` };
}
