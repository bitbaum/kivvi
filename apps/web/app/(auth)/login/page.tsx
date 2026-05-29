"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, Check, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { KivviLogo } from "@/components/kivvi-logo";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        setIsLoading(false);
        return;
      }

      // Full page navigation is more reliable than router.push for post-login
      // redirect — avoids hanging when dashboard has heavy data to load
      window.location.href = callbackUrl;
    } catch (err) {
      setError(t("errorGeneric"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Language switcher */}
      <div className="fixed right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Left side - Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <KivviLogo size={40} />
              <span className="text-2xl font-bold">Kivvi</span>
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-semibold">{t("signIn")}</h1>
          <p className="mb-8 text-muted-foreground">{t("signInSubtitle")}</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 15A7 7 0 108 1a7 7 0 000 14zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z"
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("emailAddress")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.ch"
                required
                autoComplete="email"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("password")}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 pr-11 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? t("hidePassword") : t("showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full shadow-sm"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              {t("createAccount")}
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t.rich("termsAndPrivacy", {
              terms: (chunks) => (
                <Link href="/terms" className="hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" className="hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>

      {/* Right side - Brand & Features */}
      <div className="hidden flex-1 items-center justify-center brand-gradient p-12 lg:flex">
        <div className="max-w-md text-white">
          <h2 className="mb-3 text-3xl font-bold leading-tight">
            {t("businessOnAutopilot")}
          </h2>
          <p className="mb-8 text-white/80">{t("heroSubtitle")}</p>

          <ul className="space-y-4">
            <Feature text={t("features.aiInvoices")} />
            <Feature text={t("features.bankMatching")} />
            <Feature text={t("features.paymentReminders")} />
            <Feature text={t("features.qrBills")} />
            <Feature text={t("features.selfHostAI")} />
          </ul>

          <div className="mt-10 flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
            <Shield className="h-5 w-5 shrink-0 text-white/60" />
            <p className="text-sm text-white/80">{t("securityNote")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Check className="h-3.5 w-3.5" />
      </div>
      <span className="text-sm">{text}</span>
    </li>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
