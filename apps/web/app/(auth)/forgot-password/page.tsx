import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoveryForm } from "@/components/auth/auth-forms";
import { kivviMethods } from "@/lib/accountkit/methods";

/**
 * "Forgot your password?": AccountKit's recovery form. The mailed link lands
 * on the sign-in page, which sets the new password. Every other way in is one
 * tap away.
 */
export default async function ForgotPasswordPage() {
  // Recovery needs account mail, which is the box's env.
  await connection();
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  const methods = kivviMethods();
  return (
    <AuthShell title={t("resetPassword")} subtitle={t("resetPasswordSubtitle")}>
      <div className="flex flex-col gap-4">
        {methods.passwordReset ? (
          <RecoveryForm labels={authLabelsFor(locale)} methods={methods} next="/dashboard" />
        ) : (
          <p role="status" className="rounded-lg bg-muted p-3 text-sm">
            {t("recoveryUnavailable")}
          </p>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("otherWaysIn")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
