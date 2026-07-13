"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  Building2,
  Clock,
  Loader2,
  Mail,
  Search,
  UserCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { KivviLogo } from "@/components/kivvi-logo";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { createCompanyAction } from "@/app/actions/memberships";
import { ProfileForm } from "@/app/(dashboard)/settings/profile/profile-form";
import { formatDate } from "@/lib/utils";

interface JoinHomeProps {
  title: string;
  description: string;
  user: {
    name: string;
    email: string;
    avatarBase64: string | null;
    location: string | null;
    languages: string[];
    skills: string[];
    availabilityType: string | null;
  };
  pendingInvites: Array<{
    id: string;
    companyName: string;
    expiresAt: string;
    inviteUrl: string;
  }>;
}

export function JoinHome({
  title,
  description,
  user,
  pendingInvites,
}: JoinHomeProps) {
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
      await Promise.race([
        updateSession({
          companyId: result.data?.companyId,
          companyName: result.data?.companyName,
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      window.location.href = "/onboarding";
    } else {
      setError(result.error || t("errorGeneric"));
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <KivviLogo size={36} />
            <span className="text-xl font-bold">Kivvi</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            {t("signOut")}
          </Button>
        </div>

        <header className="rounded-xl border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {user.avatarBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarBase64}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
              <p className="mt-2 truncate text-sm font-medium">
                {user.name || user.email}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="font-semibold">{t("profileTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("profileDesc")}
                </p>
              </div>
              <ProfileForm
                initialData={{
                  name: user.name,
                  email: user.email,
                  location: user.location,
                  languages: user.languages,
                  skills: user.skills,
                  availabilityType: user.availabilityType,
                }}
              />
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{t("createOrg")}</h2>
              </div>
              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="z.B. revamp-it Zürich"
                  disabled={creating}
                  minLength={2}
                  required
                  autoComplete="organization"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="submit"
                  disabled={creating || companyName.trim().length < 2}
                  className="w-full"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {creating ? t("creating") : t("create")}
                </Button>
              </form>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{t("pendingInvites")}</h2>
              </div>
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("waitingDesc")}
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="rounded-lg border p-3">
                      <p className="font-medium">{invite.companyName}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {t("expiresOn", {
                          date: formatDate(new Date(invite.expiresAt)),
                        })}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link href={invite.inviteUrl}>
                            {t("acceptInvite")}
                          </Link>
                        </Button>
                        <CopyButton
                          value={invite.inviteUrl}
                          label={t("copyInviteLink")}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-dashed bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">{t("discoveryTitle")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("discoveryDesc")}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
