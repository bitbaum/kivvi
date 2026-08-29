"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { changePasswordAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/ui/form-field";

export function ChangePasswordForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const input = {
        currentPassword: formData.get("currentPassword") as string,
        newPassword: formData.get("newPassword") as string,
        confirmPassword: formData.get("confirmPassword") as string,
      };

      if (input.newPassword !== input.confirmPassword) {
        setError(t("profileSection.passwordMismatch"));
        setIsSubmitting(false);
        return;
      }

      const result = await changePasswordAction(input);

      if (result.success) {
        setSuccess(true);
        e.currentTarget.reset();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t("profileSection.passwordChanged")}
        </div>
      )}

      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("profileSection.changePassword")}</h2>
        </div>
        <div className="grid gap-6 p-6">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium">
              {t("profileSection.currentPassword")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="password"
              id="currentPassword"
              name="currentPassword"
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium">
              {t("profileSection.newPassword")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="password"
              id="newPassword"
              name="newPassword"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("profileSection.passwordMinLength")}
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">
              {t("profileSection.confirmPassword")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            isSubmitting && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? tc("saving") : t("profileSection.changePassword")}
        </button>
      </div>
    </form>
  );
}
