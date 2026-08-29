import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { organizationProfiles, vacancies } from "@kivvi/database";
import { and, eq } from "drizzle-orm";
import { ApplyForm } from "./apply-form";

interface PageProps {
  params: { slug: string };
}

export default async function OrganizationProfilePage({ params }: PageProps) {
  const t = await getTranslations("orgs");
  const tv = await getTranslations("settings.vacancies");
  const session = await auth();

  const profile = await db.query.organizationProfiles.findFirst({
    where: and(
      eq(organizationProfiles.publicSlug, params.slug),
      eq(organizationProfiles.isPublic, true),
    ),
    with: { company: true },
  });
  if (!profile) notFound();

  const publishedVacancies = await db.query.vacancies.findMany({
    where: and(eq(vacancies.companyId, profile.companyId), eq(vacancies.status, "published")),
    orderBy: (vacancies, { desc }) => [desc(vacancies.createdAt)],
  });

  return (
    <div className="py-10 md:py-14">
      <Link href="/orgs" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backToDirectory")}
      </Link>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            {profile.logoBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logoBase64} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">{profile.publicName}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {profile.category && <span>{profile.category}</span>}
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  {t("website")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {profile.shortDescription && (
              <p className="mt-5 max-w-3xl text-muted-foreground">{profile.shortDescription}</p>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("vacanciesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("vacanciesDesc")}</p>
        </div>

        {publishedVacancies.length === 0 ? (
          <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            {t("noVacancies")}
          </div>
        ) : (
          <div className="grid gap-4">
            {publishedVacancies.map((vacancy) => (
              <article key={vacancy.id} className="rounded-xl border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{vacancy.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tv(`type.${vacancy.type}`)} · {tv(`locationMode.${vacancy.locationMode}`)}
                      {vacancy.workload ? ` · ${vacancy.workload}` : ""}
                    </p>
                    {vacancy.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {vacancy.skills.map((skill) => (
                          <span key={skill} className="rounded-md bg-muted px-2 py-1 text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-80">
                    <ApplyForm
                      companyId={profile.companyId}
                      vacancyId={vacancy.id}
                      isAuthenticated={!!session?.user?.id}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {profile.acceptingApplications && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">{t("generalApplication")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("generalApplicationDesc")}</p>
            <div className="mt-4 max-w-xl">
              <ApplyForm companyId={profile.companyId} isAuthenticated={!!session?.user?.id} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
