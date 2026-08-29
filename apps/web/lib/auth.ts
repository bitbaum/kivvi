import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { findMembership } from "@kivvi/core/src/domain/memberships";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          with: { company: true },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        const companyData = user.company as {
          name: string;
          settings: CompanySettings | null;
        } | null;
        const settings = companyData?.settings ?? {};

        // Read role from memberships table (SSOT), not users.role
        let role: string = "member";
        if (user.companyId) {
          const membership = await findMembership(db, user.id, user.companyId);
          role = membership?.role ?? "member";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          companyName: companyData?.name ?? null,
          role,
          onboardingComplete: !!settings.onboardingCompletedAt,
          enabledModules: settings.enabledModules ?? null,
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
        if (user?.companyId) {
          token.companyId = user.companyId;

          // Look up role from memberships table (SSOT for roles)
          const membership = await findMembership(db, token.id as string, user.companyId);
          token.role = membership?.role ?? "member";

          // Refresh company name and onboarding status
          const company = await db.query.companies.findFirst({
            where: eq(companies.id, user.companyId),
          });
          token.companyName = company?.name ?? null;
          const settings = (company?.settings as CompanySettings) ?? {};
          token.onboardingComplete = !!settings.onboardingCompletedAt;
          token.enabledModules = settings.enabledModules ?? null;
        } else if (user) {
          token.companyId = null;
          token.companyName = null;
          token.role = "member";
          token.onboardingComplete = false;
          token.enabledModules = null;
        }
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

// Helper to get current session in server components
export { auth as getSession };
