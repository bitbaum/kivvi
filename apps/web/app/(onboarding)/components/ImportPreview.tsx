"use client";

import { useTranslations } from "next-intl";

interface ImportPreviewProps {
  rows: Array<Record<string, string | null>>;
  maxRows?: number;
}

export function ImportPreview({ rows, maxRows = 5 }: ImportPreviewProps) {
  const t = useTranslations("onboarding");

  if (rows.length === 0) return null;

  const previewRows = rows.slice(0, maxRows);
  const allKeys = Object.keys(previewRows[0]).filter((k) =>
    previewRows.some((r) => r[k] && r[k]!.trim() !== ""),
  );

  // Show max 6 columns to avoid overflow
  const displayKeys = allKeys.slice(0, 6);
  const hasMore = allKeys.length > 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("preview", { rows: rows.length })}</span>
        {hasMore && (
          <span className="text-xs text-muted-foreground">
            {t("showingColumns", { shown: displayKeys.length, total: allKeys.length })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {displayKeys.map((key) => (
                <th key={key} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {previewRows.map((row, i) => (
              <tr key={i}>
                {displayKeys.map((key) => (
                  <td key={key} className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5">
                    {row[key] || <span className="text-muted-foreground">--</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
