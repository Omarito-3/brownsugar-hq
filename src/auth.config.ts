import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  /**
   * Derive the callback/base URL from the incoming request's host rather than a
   * hardcoded AUTH_URL. Vercel terminates TLS at its proxy and sets the Host
   * header correctly, so this makes preview deployments (which each get their
   * own URL) work without per-deployment configuration.
   */
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as Role;
        token.branchId = user.branchId as string | null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.branchId = token.branchId as string | null;
      return session;
    },
  },
} satisfies NextAuthConfig;
