import { redirect } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";
import { AvatarUpload } from "./avatar-upload";

export default async function ProfileSettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");

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

      <ChangePasswordForm />
    </div>
  );
}
