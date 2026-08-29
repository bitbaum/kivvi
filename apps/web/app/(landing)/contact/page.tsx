import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMeta } from "@/lib/config/site";
import { ContactForm } from "./_contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.contact.metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("landing.contact");
  const benefits = t.raw("benefits") as string[];

  return (
    <div className="mx-auto max-w-4xl py-16 px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Two-column layout: mobile = stacked (form first), desktop = side by side */}
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Right column on mobile (rendered first = shown first) */}
        <div className="order-1 lg:order-2">
          <ContactForm />
        </div>

        {/* Left column: benefits */}
        <div className="order-2 lg:order-1">
          <h2 className="mb-6 text-xl font-semibold">{t("whyTitle")}</h2>
          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cloud CTA */}
      <div className="mt-20 rounded-2xl border bg-muted/30 px-8 py-10 text-center">
        <h2 className="mb-2 text-xl font-semibold">{t("ctaCloud.title")}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{t("ctaCloud.description")}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            {t("ctaCloud.tryFree")}
          </a>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            {t("ctaCloud.viewPricing")}
          </a>
        </div>
      </div>
    </div>
  );
}
