"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { submitContactFormAction } from "@/app/actions/contact";

const BETRIEBSTYP_OPTIONS = [
  { value: "it_refurbisher", label: "IT-Refurbisher" },
  { value: "brockenshaus", label: "Brockenhaus / Sozialkaufhaus" },
  { value: "repair_cafe", label: "Repair Café" },
  { value: "vintage_shop", label: "Vintage-Shop" },
  { value: "other", label: "Anderes" },
] as const;

const inputClass =
  "w-full rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50";
const labelClass = "mb-1.5 block text-sm font-medium";

export function ContactForm() {
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
        setError(result.error ?? "Ein unbekannter Fehler ist aufgetreten.");
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
        <p className="text-lg font-semibold">Danke!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Wir melden uns innerhalb von 2 Werktagen.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Max Muster"
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* E-Mail */}
      <div>
        <label htmlFor="email" className={labelClass}>
          E-Mail <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="max@beispiel.ch"
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* Organisation */}
      <div>
        <label htmlFor="organisation" className={labelClass}>
          Organisation{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
          </span>
        </label>
        <input
          id="organisation"
          name="organisation"
          type="text"
          placeholder="Ihr Betrieb"
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {/* Betriebstyp */}
      <div>
        <label htmlFor="betriebstyp" className={labelClass}>
          Betriebstyp{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
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
            Bitte wählen…
          </option>
          {BETRIEBSTYP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Nachricht */}
      <div>
        <label htmlFor="message" className={labelClass}>
          Nachricht{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Was beschäftigt Sie?"
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
        Demo anfragen
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Waitlist inline form
// ---------------------------------------------------------------------------

export function WaitlistForm() {
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
        setError(result.error ?? "Ein unbekannter Fehler ist aufgetreten.");
      }
    });
  }

  if (success) {
    return (
      <p className="text-sm font-medium text-success">
        Sie sind auf der Warteliste. Wir melden uns!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="email"
        type="email"
        required
        placeholder="ihre@email.ch"
        disabled={isPending}
        className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 whitespace-nowrap"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Auf Warteliste
      </button>
      {error && (
        <p className="w-full text-xs text-destructive sm:col-span-2">{error}</p>
      )}
    </form>
  );
}
