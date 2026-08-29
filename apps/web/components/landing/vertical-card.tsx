import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VERTICAL_ICONS } from "./vertical-icons";

interface VerticalCardProps {
  id: string;
  href: string;
  title: string;
  hook: string;
  bullets: ReadonlyArray<string>;
}

export function VerticalCard({ id, href, title, hook, bullets }: VerticalCardProps) {
  const Icon = VERTICAL_ICONS[id];
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          {Icon && <Icon className="h-5 w-5" />}
        </div>
        <div className="flex items-center gap-2 font-semibold">
          {title}
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
      <p className="text-sm font-medium">{hook}</p>
      <ul className="space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {b}
          </li>
        ))}
      </ul>
    </Link>
  );
}
