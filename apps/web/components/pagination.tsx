import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
  labels: {
    showing: string;
    previous: string;
    next: string;
    pageOf: string;
  };
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
  labels,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {labels.showing
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {labels.previous}
          </Link>
        ) : (
          <span className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground opacity-50">
            <ChevronLeft className="h-4 w-4" />
            {labels.previous}
          </span>
        )}

        <span className="text-sm text-muted-foreground">
          {labels.pageOf
            .replace('{page}', String(page))
            .replace('{totalPages}', String(totalPages))}
        </span>

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            {labels.next}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground opacity-50">
            {labels.next}
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
