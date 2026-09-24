/**
 * Regression tests for salary confidentiality (docs/DECISIONS.md D-016):
 * MANAGERs may not view or edit individual salaries anywhere, enforced on the
 * server — in the queries that feed pages and in the server actions.
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", async () => ({
  prisma: (await import("./helpers/prisma-mock")).prismaMock.prisma,
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next-intl/server", async () => await import("./helpers/intl"));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/auth";
import { createEmployee, updateEmployee } from "@/lib/actions/employees";
import {
  getEmployeeCostByBranch,
  getEmployeeForEdit,
  getEmployeeMetrics,
  getEmployeesTable,
} from "@/lib/queries/employees";
import { prismaMock } from "./helpers/prisma-mock";
import { sessionFor } from "./helpers/session";

const mockAuth = auth as unknown as Mock;

/** A DB row that includes a salary, as if the database ignored `omit`. */
const employeeRow = {
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
};

const validInput = {
  name: "Lina",
  phone: "",
  branchId: "b1",
  position: "BARISTA" as const,
  salaryIls: 9999,
  startDate: "2026-01-01",
  notes: "",
};

beforeEach(() => {
  prismaMock.reset();
  mockAuth.mockReset();
});

describe("employee queries without salary visibility", () => {
  it("getEmployeesTable omits salary from the DB query and never returns it", async () => {
    prismaMock.on("employee.findMany", () => [employeeRow]);

    const rows = await getEmployeesTable("b1", { includeSalary: false });

    const [call] = prismaMock.callsTo("employee.findMany");
    expect((call.args[0] as { omit: unknown }).omit).toEqual({ salaryIls: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].salaryIls).toBeNull();
  });

  it("getEmployeeMetrics does not aggregate salaries", async () => {
    prismaMock.on("employee.count", () => 3);

    const metrics = await getEmployeeMetrics("b1", { includeSalary: false });

    expect(metrics).toEqual({ activeCount: 3, totalSalaryIls: null, laborCostPercent: null });
    expect(prismaMock.callsTo("employee.aggregate")).toHaveLength(0);
  });

  it("getEmployeeCostByBranch does not sum salaries", async () => {
    prismaMock.on("branch.findMany", () => [{ id: "b1", name: "Branch 1" }]);
    prismaMock.on("employee.groupBy", () => [
      { branchId: "b1", _count: { _all: 2 }, _sum: { salaryIls: 8000 } },
    ]);

    const costs = await getEmployeeCostByBranch("b1", { includeSalary: false });

    const [call] = prismaMock.callsTo("employee.groupBy");
    expect(call.args[0]).not.toHaveProperty("_sum");
    expect(costs).toEqual([
      { branchId: "b1", branchName: "Branch 1", employeeCount: 2, salaryCostIls: null },
    ]);
  });

  it("getEmployeeForEdit omits salary", async () => {
    prismaMock.on("employee.findUnique", () => employeeRow);

    const employee = await getEmployeeForEdit("e1", { includeSalary: false });

    const [call] = prismaMock.callsTo("employee.findUnique");
    expect((call.args[0] as { omit: unknown }).omit).toEqual({ salaryIls: true });
    expect(employee?.salaryIls).toBeNull();
  });

  it("still returns salaries when visibility is granted (OWNER)", async () => {
    prismaMock.on("employee.findMany", () => [employeeRow]);

    const rows = await getEmployeesTable(undefined, { includeSalary: true });

    const [call] = prismaMock.callsTo("employee.findMany");
    expect((call.args[0] as { omit: unknown }).omit).toEqual({ salaryIls: false });
    expect(rows[0].salaryIls).toBe(4200);
  });
});

describe("employee actions", () => {
  it("MANAGER update never writes salary, even when the request contains one", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", "b1"));
    prismaMock.on("employee.findUnique", () => ({ branchId: "b1" }));

    const result = await updateEmployee("e1", { ...validInput, salaryIls: 99999 });

    expect(result).toEqual({ ok: true, id: "e1" });
    const [call] = prismaMock.callsTo("employee.update");
    const data = (call.args[0] as { data: Record<string, unknown> }).data;
    expect(data).not.toHaveProperty("salaryIls");
    expect(data.name).toBe("Lina");
  });

  it("MANAGER create ignores a submitted salary and stores 0", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", "b1"));
    prismaMock.on("employee.create", () => ({ id: "new" }));

    const result = await createEmployee({ ...validInput, salaryIls: 12345 });

    expect(result).toEqual({ ok: true, id: "new" });
    const [call] = prismaMock.callsTo("employee.create");
    expect((call.args[0] as { data: { salaryIls: unknown } }).data.salaryIls).toBe(0);
  });

  it("MANAGER can create without sending a salary at all", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", "b1"));
    prismaMock.on("employee.create", () => ({ id: "new" }));

    const { salaryIls: _omitted, ...withoutSalary } = validInput;
    void _omitted;
    const result = await createEmployee(withoutSalary);

    expect(result.ok).toBe(true);
  });

  it("OWNER update writes the submitted salary", async () => {
    mockAuth.mockResolvedValue(sessionFor("OWNER", null));
    prismaMock.on("employee.findUnique", () => ({ branchId: "b1" }));

    await updateEmployee("e1", { ...validInput, salaryIls: 5100 });

    const [call] = prismaMock.callsTo("employee.update");
    expect((call.args[0] as { data: { salaryIls: unknown } }).data.salaryIls).toBe(5100);
  });

  it("OWNER create requires a salary", async () => {
    mockAuth.mockResolvedValue(sessionFor("OWNER", null));

    const { salaryIls: _omitted, ...withoutSalary } = validInput;
    void _omitted;
    const result = await createEmployee(withoutSalary);

    expect(result.ok).toBe(false);
    expect(prismaMock.callsTo("employee.create")).toHaveLength(0);
  });

  it("STAFF cannot create or update employees", async () => {
    mockAuth.mockResolvedValue(sessionFor("STAFF", "b1"));
    prismaMock.on("employee.findUnique", () => ({ branchId: "b1" }));

    expect((await createEmployee(validInput)).ok).toBe(false);
    expect((await updateEmployee("e1", validInput)).ok).toBe(false);
    expect(prismaMock.callsTo("employee.create")).toHaveLength(0);
    expect(prismaMock.callsTo("employee.update")).toHaveLength(0);
  });

  it("a MANAGER with no branch cannot create or update employees", async () => {
    mockAuth.mockResolvedValue(sessionFor("MANAGER", null));
    prismaMock.on("employee.findUnique", () => ({ branchId: "b1" }));

    expect((await createEmployee(validInput)).ok).toBe(false);
    expect((await updateEmployee("e1", validInput)).ok).toBe(false);
    expect(prismaMock.callsTo("employee.create")).toHaveLength(0);
    expect(prismaMock.callsTo("employee.update")).toHaveLength(0);
  });
});
