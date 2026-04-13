import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface LandingCtaSectionProps {
  title: string;
  description: string;
  id?: string;
}

export function LandingCtaSection({
  title,
  description,
  id,
}: LandingCtaSectionProps) {
  return (
    <section
      id={id}
      className="mx-auto max-w-2xl py-16 text-center scroll-mt-16"
    >
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <p className="mb-8 text-muted-foreground">{description}</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Demo anfragen
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted"
        >
          Kivvi ausprobieren <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
