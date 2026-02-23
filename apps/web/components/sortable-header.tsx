import Link from 'next/link';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSort?: string;
  currentOrder?: 'asc' | 'desc';
  buildHref: (sort: string, order: 'asc' | 'desc') => string;
}

/**
 * Renders a clickable sort link with direction indicator.
 * Does NOT render a wrapper element — consumer wraps in <th>, <div>, etc.
 */
export function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  buildHref,
}: SortableHeaderProps) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';

  return (
    <Link
      href={buildHref(field, nextOrder)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        currentOrder === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-30" />
      )}
    </Link>
  );
}
