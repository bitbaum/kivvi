import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { AuthShell, landingPath } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";
import { kivviMethods } from "@/lib/accountkit/methods";

/**
 * AccountKit's sign-in form, with every method this deployment offers:
 * password, passkey, an email sign-in link, recovery, Continue with OrangeCat
 * and the shared bitbaum sign-in (lib/accountkit/methods.ts).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Which methods are offered is the box's env, read per request.
  await connection();
  const [{ callbackUrl, error }, t, locale] = await Promise.all([
    searchParams,
    getTranslations("auth"),
    getLocale(),
  ]);
  const next = landingPath(callbackUrl, "/dashboard");
  return (
    <AuthShell title={t("signIn")} subtitle={t("signInSubtitle")}>
      <SignInForm
        labels={authLabelsFor(locale)}
        methods={kivviMethods()}
        next={next}
        initialError={Boolean(error)}
        signUp={t("createAccount")}
        signUpHref={
          next === "/dashboard" ? "/register" : `/register?callbackUrl=${encodeURIComponent(next)}`
        }
      />
    </AuthShell>
  );
}
