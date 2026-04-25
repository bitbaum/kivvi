import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { VERTICALS } from "@/lib/config/site";

export async function SeeAlsoSection({ current }: { current: string }) {
  const t = await getTranslations("landing.seeAlso");
  const tVerticals = await getTranslations("landing.verticals");
  const others = VERTICALS.filter((v) => v.id !== current);

  return (
    <section className="mx-auto max-w-4xl py-8">
      <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {t("title")}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {others.map((v) => (
          <Link
            key={v.id}
            href={v.href}
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
              {tVerticals(`${v.id}.title`)}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tVerticals(`${v.id}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
