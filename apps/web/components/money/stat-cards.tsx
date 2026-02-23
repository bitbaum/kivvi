import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  href,
  count,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  href: string;
  count?: number;
}) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <div className={cn('rounded-md p-1.5', bgColor, color)}>{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={cn('ml-auto rounded-full px-2 py-0.5 text-xs font-medium', bgColor, color)}>
            {count}
          </span>
        )}
      </div>
      <p className={cn('mt-2 text-xl font-bold', color)}>{value}</p>
    </Link>
  );
}

export function MiniStat({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className={cn('rounded-md p-1.5', bgColor, color)}>{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn('mt-2 text-xl font-bold', color)}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold group-hover:text-primary transition-colors">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}
