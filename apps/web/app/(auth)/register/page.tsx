import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { AuthShell, landingPath } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";
import { kivviMethods } from "@/lib/accountkit/methods";

/**
 * AccountKit's sign-up: an email and a password, or any other method. A new
 * person lands on /join, where they create their organisation or accept an
 * invitation; an invitation link brings them back to it (callbackUrl).
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  await connection();
  const [{ callbackUrl }, t, locale] = await Promise.all([
    searchParams,
    getTranslations("auth"),
    getLocale(),
  ]);
  const next = landingPath(callbackUrl, "/join");
  return (
    <AuthShell title={t("register")} subtitle={t("registerSubtitle")}>
      <SignUpForm
        labels={authLabelsFor(locale)}
        methods={kivviMethods()}
        next={next}
        signIn={t("signIn")}
        signInHref={next === "/join" ? "/login" : `/login?callbackUrl=${encodeURIComponent(next)}`}
      />
    </AuthShell>
  );
}
