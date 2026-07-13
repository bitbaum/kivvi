import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, invitations, users } from "@kivvi/database";
import { JoinHome } from "./join-home";

export default async function JoinPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.companyId) redirect("/dashboard");

  const t = await getTranslations("join");
  const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";

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

  if (!user) redirect("/login");

  const pendingInvites = await db
    .select({
      id: invitations.id,
      companyName: companies.name,
      token: invitations.token,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .innerJoin(companies, eq(invitations.companyId, companies.id))
    .where(
      and(
        eq(invitations.email, user.email.toLowerCase().trim()),
        eq(invitations.status, "pending"),
      ),
    );

  return (
    <JoinHome
      title={t("title")}
      description={t("desc")}
      user={{
        name: user.name || "",
        email: user.email,
        avatarBase64: user.avatarBase64,
        location: user.location,
        languages: user.languages,
        skills: user.skills,
        availabilityType: user.availabilityType,
      }}
      pendingInvites={pendingInvites.map((invite) => ({
        id: invite.id,
        companyName: invite.companyName,
        expiresAt: invite.expiresAt.toISOString(),
        inviteUrl: `${baseUrl}/invite/${invite.token}`,
      }))}
    />
  );
}
