import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Authenticated proxy for private Blob files.
 *
 * The Blob store is private, so its URLs aren't directly fetchable. Every read
 * comes through here, and access is decided by the record that *owns* the file
 * rather than by the path itself:
 *
 *   - Expense receipts: visible to OWNER, or to anyone scoped to that expense's
 *     branch (Finance is branch-scoped but open to all roles).
 *   - Documents: OWNER, or a MANAGER of the document's branch. Documents with
 *     no branch are org-wide. STAFF never sees documents — the Management page
 *     doesn't show them either.
 *   - Not yet referenced by any record: readable only by the uploader, whose id
 *     is embedded in the pathname. This is the window between choosing a file
 *     and saving the form, where the preview must still render.
 */

function deny() {
  // 404 rather than 403 so this can't be used to probe which paths exist.
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user) return deny();

  const { path } = await params;
  const pathname = path.join("/");
  const storedUrl = `/api/files/${pathname}`;

  const { role, branchId: userBranchId, id: userId } = session.user;

  const [expense, document] = await Promise.all([
    prisma.expense.findFirst({ where: { receiptUrl: storedUrl }, select: { branchId: true } }),
    prisma.document.findFirst({ where: { fileUrl: storedUrl }, select: { branchId: true } }),
  ]);

  let allowed: boolean;

  if (expense) {
    allowed = role === "OWNER" || expense.branchId === userBranchId;
  } else if (document) {
    if (role === "OWNER") allowed = true;
    // A MANAGER without a branch fails closed, including for org-wide documents.
    else if (role === "MANAGER" && userBranchId) {
      allowed = document.branchId === null || document.branchId === userBranchId;
    } else allowed = false;
  } else {
    // Unattached upload: the second path segment is the uploader's user id.
    allowed = path.length >= 2 && path[1] === userId;
  }

  if (!allowed) return deny();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[files] BLOB_READ_WRITE_TOKEN is not set");
    return NextResponse.json({ error: "File storage is not configured." }, { status: 500 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return deny();

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Length": String(result.blob.size),
        // Inline so receipt images render in an <img>; the filename is the
        // opaque blob key, which is fine for a preview.
        "Content-Disposition": "inline",
        // Authenticated content must never be cached by a shared CDN.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[files] blob get failed:", err);
    return deny();
  }
}
