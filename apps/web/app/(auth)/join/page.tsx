"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Loader2, ArrowRight, Building2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { KivviLogo } from "@/components/kivvi-logo";
import { createCompanyAction } from "@/app/actions/memberships";
import { Button } from "@/components/ui/button";

export default function JoinPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const t = useTranslations("join");

  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = companyName.trim();
    if (name.length < 2) return;
    setCreating(true);
    setError("");
    const result = await createCompanyAction({ companyName: name });
    if (result.success) {
      await updateSession();
      router.push("/onboarding");
    } else {
      setError(result.error || t("errorGeneric"));
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Left — form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <KivviLogo size={40} />
              <span className="text-2xl font-bold">Kivvi</span>
            </Link>
          </div>

          <div className="mb-2 flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">{t("createOrg")}</h1>
          </div>
          <p className="mb-8 text-muted-foreground">{t("desc")}</p>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
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

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="companyName"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("orgNamePlaceholder")}
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="z.B. revamp-it Zürich"
                disabled={creating}
                minLength={2}
                required
                autoFocus
                autoComplete="organization"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={creating || companyName.trim().length < 2}
              className="w-full shadow-sm"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {creating ? t("creating") : t("create")}
            </Button>
          </form>

          {/* Invite hint */}
          <div className="mt-8 rounded-xl border border-dashed bg-muted/30 p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {t("waitingForInvite")}
            </div>
            <p className="text-sm text-muted-foreground">{t("waitingDesc")}</p>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              {t("signOut")}
            </Button>
          </p>
        </div>
      </div>

      {/* Right — brand */}
      <div className="hidden flex-1 items-center justify-center brand-gradient p-12 lg:flex">
        <div className="max-w-md text-white space-y-6">
          <h2 className="text-3xl font-bold leading-tight">
            Das Betriebssystem der Kreislaufwirtschaft.
          </h2>
          <p className="text-white/80 text-lg">
            Ihr Betrieb in wenigen Minuten eingerichtet — Buchhaltung, Inventar,
            KI-Erfassung und Impact-Tracking, alles in einem.
          </p>
          <ul className="space-y-3 text-white/80">
            {[
              "QR-Rechnungen & doppelte Buchführung",
              "KI-gestützte Wareneingabe",
              "CO₂-Impact automatisch berechnet",
              "Open Source & selbst-hostbar",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path
                      d="M10 3L5 8.5 2 5.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
