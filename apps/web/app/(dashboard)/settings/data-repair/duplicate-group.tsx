"use client";

import { useState } from "react";
import { Loader2, Merge } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DuplicateContactGroup } from "@kivvi/core/src/domain/data-quality";
import { mergeContactsAction } from "@/app/actions/data-quality";

export function DuplicateGroup({
  group,
  onMerged,
}: {
  group: DuplicateContactGroup;
  onMerged: () => void;
}) {
  const tDQ = useTranslations("dataQuality");
  const [primaryId, setPrimaryId] = useState(
    group.contacts.reduce((a, b) => (b.documentCount > a.documentCount ? b : a))
      .id,
  );
  const [merging, setMerging] = useState(false);

  async function handleMerge(duplicateId: string) {
    setMerging(true);
    const result = await mergeContactsAction(primaryId, duplicateId);
    if (result.success && result.data) {
      toast.success(
        tDQ("mergeSuccess", { count: result.data.documentsReassigned }),
      );
      onMerged();
    } else {
      toast.error(result.error);
    }
    setMerging(false);
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {tDQ("duplicateName")} &ldquo;{group.normalizedName}&rdquo;
      </p>
      <div className="space-y-2">
        {group.contacts.map((c) => {
          const isPrimary = c.id === primaryId;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                isPrimary ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <input
                type="radio"
                name={`primary-${group.normalizedName}`}
                checked={isPrimary}
                onChange={() => setPrimaryId(c.id)}
                className="h-4 w-4 accent-primary"
                title={tDQ("keepPrimary")}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.contactNumber ?? "–"} · {c.type} ·{" "}
                  {c.email ?? tDQ("noEmail")} ·{" "}
                  {tDQ("docCount", { count: c.documentCount })}
                </p>
              </div>
              {isPrimary ? (
                <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {tDQ("keep")}
                </span>
              ) : (
                <button
                  onClick={() => handleMerge(c.id)}
                  disabled={merging}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                >
                  {merging ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Merge className="h-3 w-3" />
                  )}
                  {tDQ("merge")}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{tDQ("mergeDescription")}</p>
    </div>
  );
}
