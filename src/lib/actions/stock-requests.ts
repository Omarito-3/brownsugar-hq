"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stockRequestSchema, type StockRequestInput } from "@/lib/validations/stock";
import { applyMovementTx, InsufficientStockError } from "@/lib/stock-movements";

export type RequestActionResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/** Locations whose incoming requests this user may approve/reject/fulfil. */
async function approverLocationIds(role: string, branchId?: string | null): Promise<string[]> {
  if (role === "OWNER") {
    const all = await prisma.stockLocation.findMany({ select: { id: true } });
    return all.map((l) => l.id);
  }
  if (role !== "MANAGER" || !branchId) return [];
  const own = await prisma.stockLocation.findMany({ where: { branchId }, select: { id: true } });
  return own.map((l) => l.id);
}

/** Any staff or manager may request stock for their own branch's location; OWNER for any. */
async function canRequestFor(
  role: string,
  branchId: string | null | undefined,
  requestingLocationId: string
): Promise<boolean> {
  if (role === "OWNER") return true;
  if (!branchId) return false;
  const loc = await prisma.stockLocation.findUnique({
    where: { id: requestingLocationId },
    select: { branchId: true },
  });
  return loc?.branchId === branchId;
}

export async function createStockRequest(input: StockRequestInput): Promise<RequestActionResult> {
  const [session, t, tv, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("stock"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false, error: tc("notAuthenticated") };

  const parsed = stockRequestSchema(tv).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || tc("invalidInput") };
  }

  const { role, branchId, id: userId } = session.user;
  const allowed = await canRequestFor(role, branchId, parsed.data.requestingLocationId);
  if (!allowed) return { ok: false, error: t("noPermission") };

  if (parsed.data.requestingLocationId === parsed.data.fulfillingLocationId) {
    return { ok: false, error: tv("validation.fromToDifferent") };
  }

  const request = await prisma.stockRequest.create({
    data: {
      requestingLocationId: parsed.data.requestingLocationId,
      fulfillingLocationId: parsed.data.fulfillingLocationId,
      status: "PENDING",
      requestedById: userId,
      notes: parsed.data.notes || null,
      items: {
        create: parsed.data.items.map((i) => ({
          stockItemId: i.stockItemId,
          quantityRequested: i.quantityRequested,
        })),
      },
    },
  });

  revalidatePath("/stock/requests");
  revalidatePath("/dashboard");
  return { ok: true, id: request.id };
}

async function requireApprover(requestId: string) {
  const [session, t, tc] = await Promise.all([
    auth(),
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  if (!session?.user) return { ok: false as const, error: tc("notAuthenticated") };

  const request = await prisma.stockRequest.findUnique({
    where: { id: requestId },
    include: { items: true },
  });
  if (!request) return { ok: false as const, error: t("requestNotFound") };

  const approverIds = await approverLocationIds(session.user.role, session.user.branchId);
  if (!approverIds.includes(request.fulfillingLocationId)) {
    return { ok: false as const, error: t("noPermission") };
  }

  return { ok: true as const, session, request };
}

export async function approveStockRequest(id: string): Promise<SimpleActionResult> {
  const access = await requireApprover(id);
  if (!access.ok) return access;

  const t = await getTranslations("stock.actions");
  if (access.request.status !== "PENDING") {
    return { ok: false, error: t("requestNotPending") };
  }

  await prisma.stockRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: access.session.user.id, reviewedAt: new Date() },
  });

  revalidatePath("/stock/requests");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function rejectStockRequest(id: string): Promise<SimpleActionResult> {
  const access = await requireApprover(id);
  if (!access.ok) return access;

  const t = await getTranslations("stock.actions");
  if (access.request.status !== "PENDING") {
    return { ok: false, error: t("requestNotPending") };
  }

  await prisma.stockRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedById: access.session.user.id, reviewedAt: new Date() },
  });

  revalidatePath("/stock/requests");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Fulfils an approved request: moves every requested line from the fulfilling
 * location to the requesting one as a TRANSFER_OUT/TRANSFER_IN pair, records
 * how much was actually sent, and marks the request FULFILLED — all atomically,
 * so a shortfall on any one line rolls the whole fulfilment back.
 */
export async function fulfillStockRequest(id: string): Promise<SimpleActionResult> {
  const access = await requireApprover(id);
  if (!access.ok) return access;

  const [t, tc] = await Promise.all([
    getTranslations("stock.actions"),
    getTranslations("common"),
  ]);
  const { request, session } = access;

  if (request.status !== "APPROVED") {
    return { ok: false, error: t("requestNotApproved") };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of request.items) {
        const quantity = Number(item.quantityRequested);
        if (quantity <= 0) continue;

        await applyMovementTx(tx, {
          locationId: request.fulfillingLocationId,
          stockItemId: item.stockItemId,
          type: "TRANSFER_OUT",
          quantity,
          date: today,
          enteredById: session.user.id,
          notes: `Stock request fulfilment`,
        });
        await applyMovementTx(tx, {
          locationId: request.requestingLocationId,
          stockItemId: item.stockItemId,
          type: "TRANSFER_IN",
          quantity,
          date: today,
          enteredById: session.user.id,
          notes: `Stock request fulfilment`,
        });

        await tx.stockRequestItem.update({
          where: { id: item.id },
          data: { quantityFulfilled: quantity },
        });
      }

      await tx.stockRequest.update({
        where: { id },
        data: { status: "FULFILLED", reviewedById: session.user.id, reviewedAt: new Date() },
      });
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: t("insufficientStockForRequest") };
    }
    return { ok: false, error: tc("somethingWrong") };
  }

  revalidatePath("/stock/requests");
  revalidatePath("/stock");
  revalidatePath("/dashboard");
  return { ok: true };
}
