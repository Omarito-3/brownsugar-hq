import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Creates an OWNER account, or resets an existing one's password.
 *
 * Recovery path for a forgotten owner password: there is no email reset flow,
 * and /settings/users requires an owner login to reach, so a locked-out owner
 * can only be restored from outside the app.
 *
 * The password is read from OWNER_PASSWORD, or generated and printed once if
 * that is unset. Only the bcrypt hash is stored, so a generated password that
 * isn't copied from the output is unrecoverable and the script must be re-run.
 *
 * Run it against whichever database you mean to change -- DATABASE_URL decides,
 * and the script prints the host it connected to so a mistake is visible before
 * you rely on the result. See DEPLOYMENT.md for which endpoint is which.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}

function dbHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "(DATABASE_URL unset)";
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
}

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("OWNER_EMAIL is required. Example:");
    console.error('  OWNER_EMAIL="you@example.com" npx tsx scripts/create-owner.ts');
    process.exitCode = 1;
    return;
  }

  const name = process.env.OWNER_NAME?.trim() || "Owner";
  const generated = !process.env.OWNER_PASSWORD;
  const password = process.env.OWNER_PASSWORD || randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true },
  });

  // branchId stays null: an owner is scoped to all branches.
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "OWNER", isActive: true, branchId: null },
    create: { email, name, passwordHash, role: "OWNER", isActive: true },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  console.log(`Database host: ${dbHost()}`);
  console.log(
    existing
      ? `Updated existing account (was role=${existing.role}, isActive=${existing.isActive}).`
      : "Created a new account."
  );
  console.log(JSON.stringify(user, null, 1));
  console.log(`\nPassword: ${password}`);
  if (generated) {
    console.log(
      "Generated randomly and shown only now -- copy it. Set OWNER_PASSWORD to\n" +
        "choose your own instead. Change it after signing in, at /settings/account."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
