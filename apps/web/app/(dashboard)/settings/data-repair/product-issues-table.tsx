"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ProductIssue } from "@kivvi/core/src/domain/data-quality";

export function ProductIssuesTable({ issues }: { issues: ProductIssue[] }) {
  const tDQ = useTranslations("dataQuality");

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {issues.map((p) => (
            <tr key={`${p.id}-${p.issue}`} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.articleNumber ?? "–"}</p>
              </td>
              <td className="px-4 py-3 text-sm text-warning">
                {tDQ(`productIssue_${p.issue}` as Parameters<typeof tDQ>[0])}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/products/${p.id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tDQ("editLink")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
