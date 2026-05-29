"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitContactFormAction } from "@/app/actions/contact";

const BETRIEBSTYP_VALUES = [
  "it_refurbisher",
  "brockenshaus",
  "repair_cafe",
  "vintage_shop",
  "other",
] as const;

const inputClass =
  "w-full rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50";
const labelClass = "mb-1.5 block text-sm font-medium";

export function ContactForm() {
  const t = useTranslations("landing.contact.form");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    setError(null);
    startTransition(async () => {
      const result = await submitContactFormAction(data);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? t("genericError"));
      }
    });
  }

  if (success) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border bg-card p-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg
            className="h-6 w-6 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("successMessage")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          {tCommon("name")} <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder={t("namePlaceholder")}
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* E-Mail */}
      <div>
        <label htmlFor="email" className={labelClass}>
          {tCommon("email")} <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t("emailPlaceholder")}
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* Organisation */}
      <div>
        <label htmlFor="organisation" className={labelClass}>
          {t("organisationLabel")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            {t("optionalSuffix")}
          </span>
        </label>
        <input
          id="organisation"
          name="organisation"
          type="text"
          placeholder={t("organisationPlaceholder")}
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* Betriebstyp */}
      <div>
        <label htmlFor="betriebstyp" className={labelClass}>
          {t("betriebstypLabel")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            {t("optionalSuffix")}
          </span>
        </label>
        <select
          id="betriebstyp"
          name="betriebstyp"
          disabled={isPending}
          className={inputClass}
          defaultValue=""
        >
          <option value="" disabled>
            {t("betriebstypPlaceholder")}
          </option>
          {BETRIEBSTYP_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`betriebstypOptions.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Nachricht */}
      <div>
        <label htmlFor="message" className={labelClass}>
          {t("messageLabel")}{" "}
          <span className="text-muted-foreground text-xs font-normal">
            {t("optionalSuffix")}
          </span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t("messagePlaceholder")}
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* Hidden type */}
      <input type="hidden" name="type" value="demo_request" />

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("submit")}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Waitlist inline form
// ---------------------------------------------------------------------------

export function WaitlistForm() {
  const t = useTranslations("landing.contact.waitlist");
  const tForm = useTranslations("landing.contact.form");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string) ?? "";

    setError(null);
    startTransition(async () => {
      const result = await submitContactFormAction({
        name: email.split("@")[0] ?? email,
        email,
        type: "waitlist",
      });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? tForm("genericError"));
      }
    });
  }

  if (success) {
    return (
      <p className="text-sm font-medium text-success">{t("successMessage")}</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="email"
        type="email"
        required
        placeholder={t("emailPlaceholder")}
        disabled={isPending}
        className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 whitespace-nowrap"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("submit")}
      </button>
      {error && (
        <p
          role="alert"
          className="w-full text-sm text-destructive sm:col-span-2"
        >
          {error}
        </p>
      )}
    </form>
  );
}
