import { describe, expect, it } from "vitest";

import { canViewSalaries, getBranchScope } from "@/lib/permissions";

describe("getBranchScope", () => {
  it("gives OWNER every branch, whether or not a branch is set", () => {
    expect(getBranchScope({ role: "OWNER", branchId: null })).toEqual({
      kind: "all",
      branchId: undefined,
    });
    expect(getBranchScope({ role: "OWNER", branchId: "b1" }).kind).toBe("all");
  });

  it.each(["MANAGER", "STAFF"])("scopes %s to their assigned branch", (role) => {
    expect(getBranchScope({ role, branchId: "b1" })).toEqual({ kind: "branch", branchId: "b1" });
  });

  it.each([
    ["MANAGER", null],
    ["MANAGER", undefined],
    ["MANAGER", ""],
    ["STAFF", null],
    ["STAFF", undefined],
    ["STAFF", ""],
  ])("fails closed for %s with branchId %j", (role, branchId) => {
    expect(getBranchScope({ role, branchId })).toEqual({ kind: "none", branchId: undefined });
  });

  it("fails closed for an unknown role", () => {
    expect(getBranchScope({ role: "SOMETHING_ELSE", branchId: null }).kind).toBe("none");
  });
});

describe("canViewSalaries", () => {
  it("allows only OWNER", () => {
    expect(canViewSalaries("OWNER")).toBe(true);
    expect(canViewSalaries("MANAGER")).toBe(false);
    expect(canViewSalaries("STAFF")).toBe(false);
  });
});
