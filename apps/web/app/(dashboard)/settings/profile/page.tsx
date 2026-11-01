import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { authLabelsFor, isDeliverable } from "@bitbaum/accountkit/auth";
import { AccountPanel } from "@/components/auth/auth-forms";
import { kivviMethods } from "@/lib/accountkit/methods";
import { deletionRefusal, refusalText } from "@/lib/accountkit/kivvi-plugin";
import { sharedAuth } from "@/lib/accountkit/runtime";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { ProfileForm } from "./profile-form";
import { AvatarUpload } from "./avatar-upload";

export default async function ProfileSettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const requestHeaders = await headers();
  const [shared, accounts, locale, kept] = await Promise.all([
    sharedAuth.getSession(),
    sharedAuth
      .getAuth()
      .api.listUserAccounts({ headers: requestHeaders })
      .catch(() => []),
    getLocale(),
    // Said here, beside the panel's delete button: AccountKit shows a refusal
    // only as its generic sentence.
    deletionRefusal(session.user.id).catch(() => null),
  ]);
  const account = shared?.user as
    (NonNullable<typeof shared>["user"] & { twoFactorEnabled?: boolean | null }) | undefined;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarBase64: users.avatarBase64,
      location: users.location,
      languages: users.languages,
      skills: users.skills,
      availabilityType: users.availabilityType,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) redirect("/settings");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSubpageHeader title={t("userProfile")} description={t("userProfileDesc")} />

      <AvatarUpload initialAvatarBase64={user.avatarBase64} userName={user.name || ""} />

      <ProfileForm
        initialData={{
          name: user.name || "",
          email: user.email,
          location: user.location,
          languages: user.languages,
          skills: user.skills,
          availabilityType: user.availabilityType,
        }}
      />

      {/* How this person signs in: password, passkeys, a second factor, linked
          sign-ins, and deleting the account (AccountKit's panel). */}
      <section id="account" className="space-y-3">
        {kept && (
          <p role="note" className="rounded-lg bg-muted p-3 text-sm">
            {refusalText(kept, requestHeaders)}
          </p>
        )}
        <AccountPanel
          labels={authLabelsFor(locale)}
          user={{
            name: account?.name ?? user.name ?? "",
            email: account && isDeliverable(account.email) ? account.email : null,
            emailVerified: Boolean(account?.emailVerified),
            role: session.user.role ?? "member",
            twoFactorEnabled: Boolean(account?.twoFactorEnabled),
          }}
          linked={accounts.map((a) => a.providerId)}
          methods={kivviMethods()}
          accountPath="/settings/profile"
          homePath="/"
        />
      </section>
    </div>
  );
}
