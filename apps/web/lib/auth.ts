import NextAuth, { type Session } from "next-auth";
import type { NextRequest } from "next/server";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { passwordSchema } from "./password";
import { claimsFor } from "./session-claims";
import { sharedAuth, sharedAuthEnabled } from "./accountkit/runtime";
import { sharedSession } from "./accountkit/session";
import { nextAuthClientCompat } from "./accountkit/bridge";

const loginSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});

const nextAuth = NextAuth({
  // No adapter: JWT strategy with credentials provider is fully stateless.
  // The DrizzleAdapter caused CONNECT_TIMEOUT errors because Kivvi has no
  // NextAuth sessions/accounts/verificationTokens tables.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          ...(await claimsFor(db, user.companyId, user.id)),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.companyId = user.companyId ?? null;
        token.companyName = user.companyName ?? null;
        token.role = user.role ?? "member";
        token.onboardingComplete = user.onboardingComplete ?? false;
        token.enabledModules = user.enabledModules ?? null;
      }
      // Refresh session data when session is updated (company switch, onboarding completion)
      if (trigger === "update" && token.id) {
        // Re-read user's current companyId (may have changed via switchCompany)
        const user = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });
        if (user) Object.assign(token, await claimsFor(db, user.companyId, user.id));
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string;
        session.user.companyName = token.companyName as string;
        session.user.role = token.role as string;
        session.user.onboardingComplete = token.onboardingComplete as boolean;
        session.user.enabledModules = (token.enabledModules as string[] | null) ?? null;
      }
      return session;
    },
  },
});

export const { signIn, signOut } = nextAuth;

/**
 * Who is signed in. One reader for both runtimes: AccountKit's shared session
 * with AUTH_RUNTIME=accountkit, the Auth.js JWT otherwise. Same shape either
 * way (docs/ACCOUNTKIT-MIGRATION.md).
 */
export async function auth(): Promise<Session | null> {
  return sharedAuthEnabled() ? sharedSession() : nextAuth.auth();
}

/** The Auth.js middleware wrapper; middleware.ts uses it only with the switch off. */
export const authJsMiddleware = nextAuth.auth;

/** /api/auth/*: AccountKit answers when the shared runtime is on. */
export const handlers = {
  GET: async (request: NextRequest) =>
    sharedAuthEnabled()
      ? ((await nextAuthClientCompat(request)) ?? sharedAuth.GET(request))
      : nextAuth.handlers.GET(request),
  POST: async (request: NextRequest) =>
    sharedAuthEnabled()
      ? ((await nextAuthClientCompat(request)) ?? sharedAuth.POST(request))
      : nextAuth.handlers.POST(request),
};

// Helper to get current session in server components
export { auth as getSession };
