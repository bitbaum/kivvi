import Link from "next/link";
import { ArrowRight, Github, Recycle, Heart, Code2, Leaf } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Über Kivvi — Das Betriebssystem der globalen Kreislaufwirtschaft",
  description:
    "Kivvi ist das Open-Source-ERP für Kreislaufbetriebe weltweit — entwickelt aus echtem Betrieb, gebaut für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops.",
  ...buildPageMeta(
    "Über Kivvi — Das Betriebssystem der globalen Kreislaufwirtschaft",
    "Kivvi ist das Open-Source-ERP für Kreislaufbetriebe weltweit — entwickelt aus echtem Betrieb, gebaut für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops.",
  ),
};

export default async function AboutPage() {
  const t = await getTranslations("landing.about");
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Recycle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.description")}</p>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8 sm:p-10">
          <h2 className="mb-4 text-2xl font-bold">{t("mission.title")}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>{t("mission.paragraph1")}</p>
            <p>{t("mission.paragraph2")}</p>
            <p className="font-medium text-foreground">
              {t("mission.conclusion")}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-4xl py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">
          {t("values.title")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <ValueCard
            icon={<Leaf className="h-6 w-6" />}
            title={t("values.value1Title")}
            text={t("values.value1Text")}
          />
          <ValueCard
            icon={<Code2 className="h-6 w-6" />}
            title={t("values.value2Title")}
            text={t("values.value2Text")}
          />
          <ValueCard
            icon={<Heart className="h-6 w-6" />}
            title={t("values.value3Title")}
            text={t("values.value3Text")}
          />
        </div>
      </section>

      {/* Open source section */}
      <section className="mx-auto max-w-3xl py-8">
        <div className="rounded-2xl border bg-card p-8">
          <h2 className="mb-4 text-xl font-bold">{t("openSource.title")}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>{t("openSource.paragraph1")}</p>
            <p>{t("openSource.paragraph2")}</p>
            <p>{t("openSource.paragraph3")}</p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <Button asChild variant="secondary">
              <a
                href="https://github.com/g-but/kivvi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                {t("openSource.githubButton")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Who builds it */}
      <section className="mx-auto max-w-3xl py-16">
        <h2 className="mb-4 text-2xl font-bold">{t("team.title")}</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {t("team.paragraph1")}
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {t("team.paragraph2")}
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {t("team.paragraph3")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/contact">
              {t("team.ctaContact")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/circular-economy">
              {t("team.ctaCircularEconomy")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-3 text-primary">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
