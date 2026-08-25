import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

      // A failed lookup signs the user out rather than throwing. This callback
      // runs on every request that reads the session, so an unhandled error
      // here surfaces on every page and server action at once — a database
      // blip or a schema drift between code and database takes the whole site
      // down instead of returning people to /login. Failing closed also keeps
      // deactivation enforced: a lookup we cannot complete does not grant access.
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
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Checked before the password compare would also be fine, but doing it
        // after keeps the failure indistinguishable from a wrong password —
        // a deactivated account shouldn't be detectable by probing.
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;
        if (!user.isActive) return null;

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
