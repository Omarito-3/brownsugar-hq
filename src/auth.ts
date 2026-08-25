import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import authConfig from "@/auth.config";

// ---------------------------------------------------------------------------
// TEMPORARY LOGIN DIAGNOSTICS — remove once the production login is fixed.
// Logs reason codes and presence booleans only. Never logs a password, a hash,
// a secret value, or a connection string.
// ---------------------------------------------------------------------------
const DEBUG = process.env.LOGIN_DEBUG === "1";

function dbHost() {
  const url = process.env.DATABASE_URL;
  if (!url) return "(unset)";
  try {
    return new URL(url).host; // host:port only — no credentials
  } catch {
    return "(unparseable)";
  }
}

function debug(reason: string, extra: Record<string, unknown> = {}) {
  if (!DEBUG) return;
  console.error("[login-debug]", JSON.stringify({ reason, ...extra }));
}

if (DEBUG) {
  // Runs at module load, so it prints even when the failure is outside
  // authorize() — a missing AUTH_SECRET throws during JWT encoding, not here.
  console.error(
    "[login-debug]",
    JSON.stringify({
      reason: "env",
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      authSecretLength: process.env.AUTH_SECRET?.length ?? 0,
      hasNextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      dbHost: dbHost(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV ?? "(none)",
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // TEMPORARY: surfaces Auth.js internal errors (MissingSecret, JWTSessionError,
  // CallbackRouteError) which are otherwise terse or swallowed. Remove with the
  // rest of the login diagnostics.
  ...(DEBUG
    ? {
        logger: {
          error(error: Error) {
            console.error(
              "[login-debug]",
              JSON.stringify({
                reason: "authjs_error",
                name: error.name,
                message: error.message,
                cause:
                  error.cause instanceof Error
                    ? { name: error.cause.name, message: error.cause.message }
                    : undefined,
              }),
            );
          },
          warn(code: string) {
            console.error("[login-debug]", JSON.stringify({ reason: "authjs_warn", code }));
          },
        },
      }
    : {}),
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Re-checks the account on every request that reads the session.
     *
     * The edge middleware runs `auth.config.ts`, which can't reach the database,
     * so this Node-runtime override is where deactivation is actually enforced:
     * returning null invalidates the JWT, which drops the session and bounces the
     * user to /login. Without it a deactivated user would keep working until
     * their token expired, including through server actions that never render a
     * page. It also picks up role and branch changes without a re-login.
     *
     * Cost is one indexed primary-key lookup per session read.
     */
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      if (!token) return token;

      // Fresh sign-in: authorize() has just validated this user.
      if (params.user) return token;

      const userId = token.id as string | undefined;
      if (!userId) return null;

      // A failed lookup signs the user out rather than throwing. Throwing here
      // propagates to every page and server action at once, so a database blip
      // or a schema drift between code and database would take the whole site
      // down instead of returning people to /login.
      let current: { isActive: boolean; role: Role; branchId: string | null } | null;
      try {
        current = await prisma.user.findUnique({
          where: { id: userId },
          select: { isActive: true, role: true, branchId: true },
        });
      } catch (error) {
        console.error("[auth] session re-check failed:", error);
        return null;
      }

      if (!current?.isActive) return null;

      token.role = current.role;
      token.branchId = current.branchId;
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema(() => "").safeParse(credentials);
        if (!parsed.success) {
          debug("parse_failed", {
            keys: Object.keys(credentials ?? {}),
            issues: parsed.error.issues.map((i) => i.path.join(".")),
          });
          return null;
        }

        const { email, password } = parsed.data;

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          // The most important branch: a database or schema failure here is
          // otherwise reported to the user as "invalid email or password".
          debug("db_error", {
            dbHost: dbHost(),
            name: error instanceof Error ? error.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
            code: (error as { code?: string })?.code,
          });
          throw error;
        }

        if (!user) {
          debug("user_not_found", { emailLength: email.length, dbHost: dbHost() });
          return null;
        }

        // Checked before the password compare would also be fine, but doing it
        // after keeps the failure indistinguishable from a wrong password —
        // a deactivated account shouldn't be detectable by probing.
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          debug("bad_password", {
            hashPrefix: user.passwordHash.slice(0, 4), // algorithm marker, e.g. "$2a$"
            hashLength: user.passwordHash.length,
            passwordLength: password.length,
          });
          return null;
        }
        if (!user.isActive) {
          debug("inactive");
          return null;
        }

        debug("success", { role: user.role });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
});
