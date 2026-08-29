import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export { formatCurrency, formatDate } from "@kivvi/core/src/utils/format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

/** Returns the {from, to, total} values for a pagination "Showing X-Y of Z" label. */
export function paginationRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number; total: number } {
  return {
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    total,
  };
}
