import Link from "next/link";
import { VERTICALS } from "@/lib/config/site";

export function SeeAlsoSection({ current }: { current: string }) {
  const others = VERTICALS.filter((v) => v.id !== current);

  return (
    <section className="mx-auto max-w-4xl py-8">
      <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Auch interessant
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {others.map((v) => (
          <Link
            key={v.id}
            href={v.href}
            className="group rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
              {v.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {v.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
