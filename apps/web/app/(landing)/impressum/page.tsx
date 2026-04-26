import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, buildPageMeta } from "@/lib/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.impressum.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function ImpressumPage() {
  const t = await getTranslations("landing.impressum");
  return (
    <section className="mx-auto max-w-2xl py-16">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("providerHeader")}
          </h2>
          <p>
            {t("providerName")}
            <br />
            {t("providerStreet")}
            <br />
            {t("providerCity")}
            <br />
            {t("providerCountry")}
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("contactHeader")}
          </h2>
          <p>
            {t("emailLabel")}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("responsibleHeader")}
          </h2>
          <p>{t("responsibleText")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("sourceCodeHeader")}
          </h2>
          <p>
            {t("sourceCodeText")}{" "}
            <a
              href="https://github.com/g-but/kivvi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              github.com/g-but/kivvi
            </a>
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("disclaimerHeader")}
          </h2>
          <p>{t("disclaimerText")}</p>
        </div>
      </div>
    </section>
  );
}
