"use client";

import { useState } from "react";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface InviteRegisterFormProps {
  companyName: string | undefined;
  invitationEmail: string | undefined;
  error: string;
  isPending: boolean;
  onSubmit: (form: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onBack: () => void;
}

export function InviteRegisterForm({
  companyName,
  invitationEmail,
  error,
  isPending,
  onSubmit,
  onBack,
}: InviteRegisterFormProps) {
  const t = useTranslations("team");
  const [form, setForm] = useState({
    name: "",
    email: invitationEmail || "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-6">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">{t("createAccount")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("joiningCompanyNoOwn", { company: companyName ?? "" })}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("fullName")}
              </label>
              <input
                id="reg-name"
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                required
                autoComplete="name"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("email")}
              </label>
              <input
                id="reg-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                required
                autoComplete="email"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 pr-11 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("acceptInvitation")}
            </button>
          </form>

          <button
            type="button"
            onClick={onBack}
            className="flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← {t("backToOptions")}
          </button>
        </div>
      </div>
    </div>
  );
}
