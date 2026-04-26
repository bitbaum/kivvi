import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, buildPageMeta } from "@/lib/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.datenschutz.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-foreground hover:underline"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

export default async function DatenschutzPage() {
  const t = await getTranslations("landing.datenschutz");
  const purposes = t.raw("section3.purposes") as string[];
  const rights = t.raw("section6.rights") as string[];

  return (
    <section className="mx-auto max-w-2xl py-16">
      <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-10 text-sm text-muted-foreground">{t("validity")}</p>

      <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section1.title")}
          </h2>
          <p>
            {t("section1.address")}
            <br />
            {t("section1.emailLabel")} <MailLink />
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section2.title")}
          </h2>
          <p className="mb-3">
            <strong className="text-foreground">
              {t("section2.accountLabel")}
            </strong>{" "}
            {t("section2.accountText")}
          </p>
          <p className="mb-3">
            <strong className="text-foreground">
              {t("section2.usageLabel")}
            </strong>{" "}
            {t("section2.usageText")}
          </p>
          <p>
            <strong className="text-foreground">
              {t("section2.logsLabel")}
            </strong>{" "}
            {t("section2.logsText")}
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section3.title")}
          </h2>
          <ul className="space-y-1 list-disc list-inside">
            {purposes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-3">{t("section3.noAdvertising")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section4.title")}
          </h2>
          <p>{t("section4.text")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section5.title")}
          </h2>
          <p>{t("section5.text")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section6.title")}
          </h2>
          <p className="mb-3">{t("section6.intro")}</p>
          <ul className="space-y-1 list-disc list-inside">
            {rights.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-3">
            {t("section6.exercise")} <MailLink />
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section7.title")}
          </h2>
          <p>{t("section7.text")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section8.title")}
          </h2>
          <p>{t("section8.text")}</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("section9.title")}
          </h2>
          <p>
            {t("section9.text")} <MailLink />
          </p>
        </div>
      </div>
    </section>
  );
}
