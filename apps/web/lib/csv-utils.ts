/**
 * CSV building utilities (SSOT for CSV generation across all export actions).
 * UTF-8 BOM prefix for Excel compatibility.
 */

const BOM = "\uFEFF";

/** Escape a CSV value: wrap in quotes if it contains commas, quotes, or newlines */
export function escapeCsvValue(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a complete CSV string with UTF-8 BOM, headers, and data rows */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return BOM + [headerLine, ...dataLines].join("\n");
}

/** Format a date for Swiss CSV export: DD.MM.YYYY */
export function formatDateCsv(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
