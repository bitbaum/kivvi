"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { KivviLogo } from "@/components/kivvi-logo";
import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  prefillEmail?: string;
  callbackUrl?: string;
}

export function RegisterForm({ prefillEmail, callbackUrl }: RegisterFormProps) {
  const router = useRouter();
  const t = useTranslations("auth");

  const [mode, setMode] = useState<"new" | "join">("new");
  const [formData, setFormData] = useState({
    name: "",
    email: prefillEmail || "",
    password: "",
    companyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Register using Server Action — omit companyName when joining
      const result = await registerAction(
        mode === "join"
          ? {
              name: formData.name,
              email: formData.email,
              password: formData.password,
            }
          : formData,
      );

      if (!result.success) {
        setError(result.error || t("errorGeneric"));
        setIsLoading(false);
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but sign in failed, redirect to login
        router.push("/login?registered=true");
        return;
      }

      // callbackUrl takes precedence (invite links). Otherwise:
      // - owner path → onboarding (middleware lets through)
      // - join path → /join (middleware redirects /onboarding to /join for no-company users)
      router.push(callbackUrl || "/onboarding");
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <KivviLogo size={40} />
          <span className="text-2xl font-bold">Kivvi</span>
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold">{t("register")}</h1>

      {/* Mode toggle */}
      <div className="mb-6 flex rounded-lg border p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "new"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("modeNew")}
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "join"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("modeJoin")}
        </button>
      </div>

      {mode === "join" && (
        <div className="mb-6 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("joinHint")}
        </div>
      )}

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
        <div className={`grid gap-5 ${mode === "new" ? "sm:grid-cols-2" : ""}`}>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              {t("fullName")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("placeholders.fullName")}
              required
              autoComplete="name"
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {mode === "new" && (
            <div>
              <label
                htmlFor="companyName"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("companyName")}
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                placeholder={t("placeholders.companyName")}
                required
                autoComplete="organization"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("companyNameHint")}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t("emailAddress")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="max@company.ch"
            required
            autoComplete="email"
            className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("password")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border bg-background px-4 py-2.5 pr-11 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("passwordMinLength")}
          </p>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full shadow-sm">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          {t("signIn")}
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
    </>
  );
}
