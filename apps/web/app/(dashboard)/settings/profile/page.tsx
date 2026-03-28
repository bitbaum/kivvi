import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";
import { AvatarUpload } from "./avatar-upload";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarBase64: users.avatarBase64,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) redirect("/settings");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("userProfile")}</h1>
        <p className="text-muted-foreground">{t("userProfileDesc")}</p>
      </div>

      <AvatarUpload
        initialAvatarBase64={user.avatarBase64}
        userName={user.name || ""}
      />

      <ProfileForm
        initialData={{
          name: user.name || "",
          email: user.email,
        }}
      />

      <ChangePasswordForm />
    </div>
  );
}
