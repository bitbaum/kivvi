"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Loader2, Building2, Users } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <KivviLogo size={40} />
          <span className="text-2xl font-bold">Kivvi</span>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("desc")}</p>
        </div>

        {/* Option A: create own organisation */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-medium">{t("createOrg")}</h2>
          </div>
          {error && (
            <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("orgNamePlaceholder")}
              disabled={creating}
              minLength={2}
              required
              autoFocus
              className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              type="submit"
              disabled={creating || companyName.trim().length < 2}
              className="w-full"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? t("creating") : t("create")}
            </Button>
          </form>
        </div>

        {/* Option B: wait for invite */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">{t("waitingForInvite")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("waitingDesc")}</p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
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
  );
}
