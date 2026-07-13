import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { organizationProfiles } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/empty-state";

export default async function OrganizationDirectoryPage() {
  const t = await getTranslations("orgs");
  const profiles = await db.query.organizationProfiles.findMany({
    where: eq(organizationProfiles.isPublic, true),
    with: { company: true },
    orderBy: (profiles, { asc }) => [asc(profiles.publicName)],
  });

  return (
    <div className="py-12 md:py-16">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t("directoryTitle")}
        </h1>
        <p className="mt-3 text-muted-foreground">{t("directoryDesc")}</p>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("emptyTitle")}
          description={t("emptyDesc")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/orgs/${profile.publicSlug}`}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {profile.logoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.logoBase64}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {profile.publicName}
                  </h2>
                  {profile.category && (
                    <p className="text-sm text-muted-foreground">
                      {profile.category}
                    </p>
                  )}
                  {profile.location && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.location}
                    </p>
                  )}
                  {profile.shortDescription && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {profile.shortDescription}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
