type Role = "OWNER" | "MANAGER" | "STAFF";

export function sessionFor(role: Role, branchId: string | null, id = `${role.toLowerCase()}-1`) {
  return { user: { id, name: role, email: `${id}@test`, role, branchId }, expires: "2099-01-01" };
}
