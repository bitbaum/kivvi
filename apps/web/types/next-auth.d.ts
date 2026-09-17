import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      companyName: string | null;
      role: string;
      onboardingComplete: boolean;
      // Set by the session callback in lib/auth.ts; middleware gates modules on
      // it, and declaring it here is what lets that read be typed instead of `any`.
      enabledModules: string[] | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    companyId: string | null;
    companyName: string | null;
    role: string;
    onboardingComplete: boolean;
    enabledModules: string[] | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    companyId: string | null;
    companyName: string | null;
    role: string;
    onboardingComplete: boolean;
    enabledModules: string[] | null;
  }
}
