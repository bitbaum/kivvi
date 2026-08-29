import Link from "next/link";
import { Code2, Cloud, Server, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

function DeploymentCard({
  icon,
  title,
  subtitle,
  description,
  href,
  cta,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
  external?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mb-3 text-xs text-muted-foreground">{subtitle}</div>
      <p className="mb-6 flex-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      {external ? (
        <Button asChild variant="link" className="px-0 text-sm gap-1.5">
          <a href={href} target="_blank" rel="noopener noreferrer">
            {cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : (
        <Button asChild variant="link" className="px-0 text-sm gap-1.5">
          <Link href={href}>
            {cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export async function DeploymentOptionsSection() {
  const t = await getTranslations("landing.deployment");
  return (
    <section className="mx-auto max-w-4xl py-8">
      <h2 className="mb-8 text-center text-2xl font-bold">{t("title")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <DeploymentCard
          icon={<Code2 className="h-5 w-5" />}
          title={t("opensource.title")}
          subtitle={t("opensource.subtitle")}
          description={t("opensource.description")}
          href="https://github.com/g-but/kivvi"
          cta={t("opensource.cta")}
          external
        />
        <DeploymentCard
          icon={<Cloud className="h-5 w-5" />}
          title={t("cloud.title")}
          subtitle={t("cloud.subtitle")}
          description={t("cloud.description")}
          href="/contact"
          cta={t("cloud.cta")}
        />
        <DeploymentCard
          icon={<Server className="h-5 w-5" />}
          title={t("onpremise.title")}
          subtitle={t("onpremise.subtitle")}
          description={t("onpremise.description")}
          href="/contact"
          cta={t("onpremise.cta")}
        />
      </div>
    </section>
  );
}
