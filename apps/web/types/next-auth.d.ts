import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      companyName: string | null;
      role: string;
      onboardingComplete: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    companyId: string | null;
    companyName: string | null;
    role: string;
    onboardingComplete: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    companyId: string | null;
    companyName: string | null;
    role: string;
    onboardingComplete: boolean;
  }
}
