import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";
import { buildOrganizationLd, buildFaqPageLd, type FaqGroup } from "./faq-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.faq.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function FaqPage() {
  const t = await getTranslations("landing.faq");
  const tLanding = await getTranslations("landing");
  const groups = t.raw("groups") as FaqGroup[];
  const organizationLd = buildOrganizationLd(t("organizationDescription"));
  const faqPageLd = buildFaqPageLd(groups);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
      />
      {/* Hero */}
      <section className="mx-auto max-w-3xl py-16 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-xl text-muted-foreground">{t("hero.subtitle")}</p>
      </section>

      {/* In-page nav */}
      <section className="mx-auto max-w-3xl py-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="rounded-full border bg-card px-4 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {group.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ content */}
      <section className="mx-auto max-w-3xl py-8 space-y-16">
        {groups.map((group) => (
          <div key={group.id} id={group.id}>
            <h2 className="mb-6 text-2xl font-bold border-b pb-3">
              {group.title}
            </h2>
            <div className="space-y-6">
              {group.questions.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-2xl py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">{t("bottomCta.title")}</h2>
        <p className="mb-8 text-muted-foreground">
          {t("bottomCta.description")}
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/contact">
              {tLanding("requestDemo")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/register">
              {tLanding("ctaTryIt")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link
            href="/why-kivvi"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bottomCta.linkWhyKivvi")}
          </Link>
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bottomCta.linkHowItWorks")}
          </Link>
          <Link
            href="/knowledge"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bottomCta.linkKnowledge")}
          </Link>
        </div>
      </section>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-3 font-semibold text-base leading-snug">{q}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
