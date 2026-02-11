import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, companies } from '@kivvi/database';
import type { CompanySettings } from '@kivvi/database';
import { eq } from 'drizzle-orm';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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

        const companyData = user.company as { name: string; settings: CompanySettings | null } | null;
        const settings = companyData?.settings ?? {};

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          companyName: companyData?.name ?? null,
          role: user.role ?? 'user',
          onboardingComplete: !!settings.onboardingCompletedAt,
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
        token.role = user.role ?? 'user';
        token.onboardingComplete = user.onboardingComplete ?? false;
      }
      // Refresh onboarding status when session is updated
      if (trigger === 'update' && token.companyId) {
        const [company] = await db
          .select({ settings: companies.settings })
          .from(companies)
          .where(eq(companies.id, token.companyId as string));
        const settings = (company?.settings as CompanySettings) ?? {};
        token.onboardingComplete = !!settings.onboardingCompletedAt;
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
      }
      return session;
    },
  },
});

// Helper to get current session in server components
export { auth as getSession };
