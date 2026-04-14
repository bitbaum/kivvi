"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getInvitationDetailsAction,
  acceptInvitationAction,
} from "@/app/actions/invitations";
import { registerAndAcceptInviteAction } from "@/app/actions/auth";
import type { InvitationWithCompany } from "@kivvi/core/src/domain/invitations";

interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = params;
  const {
    data: session,
    status: sessionStatus,
    update: updateSession,
  } = useSession();
  const router = useRouter();
  const t = useTranslations("team");

  const [invitation, setInvitation] = useState<InvitationWithCompany | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  // Inline register form state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadInvitation() {
      const result = await getInvitationDetailsAction(token);
      if (result.success && result.data) {
        setInvitation(result.data);
      } else {
        setError(result.error || t("invitationNotFound"));
      }
      setLoading(false);
    }
    loadInvitation();
  }, [token, t]);

  const handleAccept = async () => {
    setAccepting(true);
    setError("");

    const result = await acceptInvitationAction(token);
    if (result.success) {
      setAccepted(true);
      // Refresh the JWT so the new company is available
      await updateSession();
      // Redirect to dashboard after a brief moment
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setError(result.error || t("acceptFailed"));
    }
    setAccepting(false);
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await registerAndAcceptInviteAction(token, registerForm);
      if (!result.success) {
        setError(result.error || t("acceptFailed"));
        return;
      }
      const signInResult = await signIn("credentials", {
        email: registerForm.email,
        password: registerForm.password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError(t("acceptFailed"));
        return;
      }
      setAccepted(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    });
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invitation not found or error
  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">{t("invalidInvitation")}</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  // Invitation expired
  if (
    invitation?.status !== "pending" ||
    (invitation?.expiresAt && new Date(invitation.expiresAt) < new Date())
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t("invitationExpired")}</h1>
          <p className="text-muted-foreground">{t("invitationExpiredDesc")}</p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  // Accepted successfully
  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="text-2xl font-bold">{t("invitationAccepted")}</h1>
          <p className="text-muted-foreground">{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  // Not logged in — login link or inline register form
  if (!session?.user) {
    if (showRegisterForm) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
            <div className="space-y-6">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-primary" />
                <h1 className="mt-4 text-2xl font-bold">
                  {t("createAccount")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("joiningCompanyNoOwn", {
                    company: invitation?.companyName,
                  })}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegisterAndAccept} className="space-y-4">
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
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm((p) => ({ ...p, name: e.target.value }))
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
                    value={registerForm.email || invitation?.email || ""}
                    onChange={(e) =>
                      setRegisterForm((p) => ({ ...p, email: e.target.value }))
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
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
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
                onClick={() => {
                  setShowRegisterForm(false);
                  setError("");
                }}
                className="flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← {t("backToOptions")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
          <div className="space-y-6 text-center">
            <Building2 className="mx-auto h-12 w-12 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t("joinCompany")}</h1>
              <p className="mt-2 text-muted-foreground">
                {t("invitedTo", { company: invitation?.companyName })}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href={`/login?callbackUrl=/invite/${token}`}
                className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("loginToAccept")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setRegisterForm((p) => ({
                    ...p,
                    email: invitation?.email || "",
                  }));
                  setShowRegisterForm(true);
                }}
                className="flex w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
              >
                {t("registerToAccept")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in — show accept button
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-6 text-center">
          <Building2 className="mx-auto h-12 w-12 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("joinCompany")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("invitedTo", { company: invitation?.companyName })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("roleAssignment", { role: invitation?.role })}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("acceptInvitation")}
          </button>
        </div>
      </div>
    </div>
  );
}
