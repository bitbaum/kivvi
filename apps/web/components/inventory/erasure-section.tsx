"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordDataErasureAction } from "@/app/actions/inventory-items";
import { formatDate } from "@/lib/utils";
import { DATA_ERASURE_METHODS } from "@kivvi/core/src/config/checklist-templates";

interface ErasureSectionProps {
  itemId: string;
  dataErasuredAt: Date | string | null;
  dataErasureMethod: string | null;
}

export function ErasureSection({
  itemId,
  dataErasuredAt: initialErasuredAt,
  dataErasureMethod: initialMethod,
}: ErasureSectionProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");

  const [erasuredAt, setErasuredAt] = useState(initialErasuredAt);
  const [erasureMethod, setErasureMethod] = useState(initialMethod);
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecorded = !!(erasuredAt && erasureMethod);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    setIsRecording(true);
    setError(null);

    const result = await recordDataErasureAction({
      itemId,
      input: { method, notes: notes || undefined },
    });

    if (result.success) {
      setErasuredAt(new Date().toISOString());
      setErasureMethod(method);
      setMethod("");
      setNotes("");
      toast.success(ti("erasureRecorded"));
    } else {
      setError(result.error || tc("error"));
    }
    setIsRecording(false);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{ti("dataErasure")}</h2>
      </div>

      <div className="p-6">
        {isRecorded ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="font-medium text-success">
                {ti(
                  `erasureMethod_${erasureMethod}` as Parameters<typeof ti>[0],
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {ti("erasureDate")}{" "}
              {formatDate(
                typeof erasuredAt === "string" ? erasuredAt : erasuredAt!,
              )}
            </p>
            <a
              href={`/api/inventory/items/${itemId}/erasure-certificate`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4" />
              {ti("downloadErasureCertificate")}
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {ti("erasureNotRecorded")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="erasure-method"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {ti("erasureMethod")} *
                </label>
                <select
                  id="erasure-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{ti("selectErasureMethod")}</option>
                  {Object.entries(DATA_ERASURE_METHODS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="erasure-notes"
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {tc("notes")}
                </label>
                <input
                  id="erasure-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={ti("erasureNotesPlaceholder")}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isRecording || !method}>
                {isRecording && <Loader2 className="h-4 w-4 animate-spin" />}
                {ti("recordDataErasure")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
