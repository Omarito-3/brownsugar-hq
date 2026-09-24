/**
 * Regression tests for fail-closed branch scoping (docs/DECISIONS.md D-016 #9)
 * and for salary figures never reaching a MANAGER's page props.
 *
 * Each branch-scoped page is called as a server component with a mocked
 * session. A MANAGER/STAFF with no branch must get <NoBranchAssigned /> and the
 * database must not be touched at all — previously a missing branch was read
 * as "all branches".
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ReactElement } from "react";

vi.mock("@/lib/prisma", async () => ({
  prisma: (await import("./helpers/prisma-mock")).prismaMock.prisma,
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", async () => await import("./helpers/intl"));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { NoBranchAssigned } from "@/components/layout/no-branch-assigned";
import { prismaMock } from "./helpers/prisma-mock";
import { sessionFor } from "./helpers/session";

const mockAuth = auth as unknown as Mock;

type PageModule = { default: (props: never) => Promise<ReactElement> };

const params = { params: Promise.resolve({ id: "some-id" }) };
const searchParams = { searchParams: Promise.resolve({}) };

/** Every page under (app) that loads branch-scoped data. */
const branchScopedPages: [string, () => Promise<PageModule>, object][] = [
  ["dashboard", () => import("@/app/(app)/dashboard/page"), {}],
  ["sales", () => import("@/app/(app)/sales/page"), {}],
  ["sales/new", () => import("@/app/(app)/sales/new/page"), {}],
  ["sales/[id]/edit", () => import("@/app/(app)/sales/[id]/edit/page"), params],
  ["finance", () => import("@/app/(app)/finance/page"), {}],
  ["finance/new", () => import("@/app/(app)/finance/new/page"), {}],
  ["finance/[id]/edit", () => import("@/app/(app)/finance/[id]/edit/page"), params],
  ["employees", () => import("@/app/(app)/employees/page"), {}],
  ["employees/schedule", () => import("@/app/(app)/employees/schedule/page"), searchParams],
  ["management", () => import("@/app/(app)/management/page"), {}],
  ["marketing", () => import("@/app/(app)/marketing/page"), {}],
  ["stock", () => import("@/app/(app)/stock/page"), searchParams],
  ["stock/movement", () => import("@/app/(app)/stock/movement/page"), {}],
  ["stock/requests", () => import("@/app/(app)/stock/requests/page"), {}],
  ["tools/calculator", () => import("@/app/(app)/tools/calculator/page"), {}],
];

beforeEach(() => {
  prismaMock.reset();
  mockAuth.mockReset();
});

/** Runs a page; a `redirect()` is reported as its digest instead of throwing. */
async function renderOrRedirect(Page: PageModule["default"], props: object) {
  try {
    return { element: await Page(props as never) };
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return { redirect: digest };
    throw err;
  }
}

describe.each(["MANAGER", "STAFF"] as const)("%s with no branch assigned", (role) => {
  it.each(branchScopedPages)("%s shows no branch data and queries nothing", async (_name, load, props) => {
    mockAuth.mockResolvedValue(sessionFor(role, null));
    const Page = (await load()).default;

    const result = await renderOrRedirect(Page, props);

    // Either the page renders the fail-closed notice, or (STAFF on /employees and
    // /marketing) it redirects away before loading anything. Both are closed.
    if (result.element) {
      expect(result.element.type).toBe(NoBranchAssigned);
    } else {
      expect(role).toBe("STAFF");
      expect(result.redirect).toMatch(/NEXT_REDIRECT/);
    }
    expect(prismaMock.calls).toEqual([]);
  });
});

describe("control: a MANAGER with a branch still gets data", () => {
  it("dashboard queries the database, scoped to the branch", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", "b1"));
    const Page = (await import("@/app/(app)/dashboard/page")).default;

    // Empty mock results may not satisfy every downstream computation; only the
    // fact and shape of the queries matter here.
    await Page().catch(() => undefined);

    expect(prismaMock.calls.length).toBeGreaterThan(0);
    const salesAggregate = prismaMock.callsTo("salesEntry.aggregate")[0];
    expect(JSON.stringify(salesAggregate?.args)).toContain('"branchId":"b1"');
  });
});

/** True if `target` appears as a value anywhere in a (possibly circular) props tree. */
function containsValue(node: unknown, target: unknown, seen = new Set<unknown>()): boolean {
  if (node === target) return true;
  if (node === null || typeof node !== "object" || seen.has(node)) return false;
  seen.add(node);
  return Object.values(node).some((value) => containsValue(value, target, seen));
}

/** Collects every value stored under a salary-like key anywhere in a props tree. */
function findSalaryValues(node: unknown, seen = new Set<unknown>()): unknown[] {
  if (node === null || typeof node !== "object" || seen.has(node)) return [];
  seen.add(node);
  const found: unknown[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (/salary/i.test(key) && typeof value !== "boolean") found.push(value);
    found.push(...findSalaryValues(value, seen));
  }
  return found;
}

describe("employees page salary props", () => {
  function seedEmployees() {
    prismaMock.on("branch.findMany", () => [{ id: "b1", name: "Branch 1" }]);
    prismaMock.on("employee.count", () => 1);
    prismaMock.on("employee.aggregate", () => ({ _count: { _all: 1 }, _sum: { salaryIls: 4200 } }));
    prismaMock.on("salesEntry.aggregate", () => ({ _sum: { totalIls: 10000 } }));
    prismaMock.on("employee.groupBy", () => [
      { branchId: "b1", _count: { _all: 1 }, _sum: { salaryIls: 4200 } },
    ]);
    // Returned with a salary on purpose, as if the DB ignored `omit`.
    prismaMock.on("employee.findMany", () => [
      {
        id: "e1",
        name: "Lina",
        phone: null,
        branchId: "b1",
        position: "BARISTA",
        salaryIls: 4200,
        startDate: new Date("2026-01-01T00:00:00Z"),
        isActive: true,
        notes: null,
        branch: { name: "Branch 1" },
      },
    ]);
  }

  it("sends no salary figures to a MANAGER", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", "b1"));
    seedEmployees();
    const Page = (await import("@/app/(app)/employees/page")).default;

    const element = await Page();

    const salaryValues = findSalaryValues(element.props);
    expect(salaryValues.length).toBeGreaterThan(0); // the keys exist…
    expect(salaryValues.every((v) => v === null)).toBe(true); // …but carry no data
    expect(prismaMock.callsTo("employee.aggregate")).toHaveLength(0);
    expect(containsValue(element.props, 4200)).toBe(false);
  });

  it("control: OWNER still receives salary figures", async () => {
    mockAuth.mockResolvedValue(sessionFor("OWNER", null));
    seedEmployees();
    const Page = (await import("@/app/(app)/employees/page")).default;

    const element = await Page();

    expect(containsValue(element.props, 4200)).toBe(true);
  });
});
