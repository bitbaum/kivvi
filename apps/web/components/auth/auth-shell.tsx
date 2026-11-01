import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { KivviLogo } from "@/components/kivvi-logo";
import { RegisterFeaturesPanel } from "@/app/(auth)/register/register-features-panel";

/** The frame every sign-in, sign-up and recovery page shares. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="fixed right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <KivviLogo size={40} />
              <span className="text-2xl font-bold">Kivvi</span>
            </Link>
          </div>
          <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mb-8 text-muted-foreground">{subtitle}</p>}
          {children}
        </div>
      </div>
      <RegisterFeaturesPanel />
    </div>
  );
}

/** A same-site path to land on after signing in, or the fallback. */
export function landingPath(candidate: string | undefined, fallback: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.startsWith("/\\") || candidate.startsWith("/api/")) return fallback;
  return candidate;
}
