"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import type { ContactIssue } from "@kivvi/core/src/domain/data-quality";
import { reactivateContactAction } from "@/app/actions/data-quality";

export function ContactIssuesTable({
  issues,
  onFixed,
}: {
  issues: ContactIssue[];
  onFixed: () => void;
}) {
  const tDQ = useTranslations("dataQuality");
  const [reactivating, setReactivating] = useState<string | null>(null);

  async function handleReactivate(id: string) {
    setReactivating(id);
    const result = await reactivateContactAction(id);
    if (result.success) {
      toast.success(tDQ("contactReactivated"));
      onFixed();
    } else {
      toast.error(result.error);
    }
    setReactivating(null);
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {issues.map((c) => (
            <tr key={`${c.id}-${c.issue}`} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.contactNumber ?? "–"} · {c.type}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-warning">
                {tDQ(`contactIssue_${c.issue}` as Parameters<typeof tDQ>[0])}
              </td>
              <td className="px-4 py-3 text-right">
                {c.issue === "inactive_with_open_docs" ? (
                  <button
                    onClick={() => handleReactivate(c.id)}
                    disabled={reactivating === c.id}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors ml-auto"
                  >
                    {reactivating === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {tDQ("reactivate")}
                  </button>
                ) : (
                  <Link
                    href={`/contacts/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {tDQ("editLink")}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
