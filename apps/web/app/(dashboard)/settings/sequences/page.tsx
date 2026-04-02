import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { numberSequences } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SequenceRow } from "./sequence-row";

export default async function SequencesSettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  const TYPE_LABELS: Record<string, string> = {
    invoice: t("sequences.types.invoice"),
    quote: t("sequences.types.quote"),
    order: t("sequences.types.order"),
    credit_note: t("sequences.types.creditNote"),
    delivery_note: t("sequences.types.deliveryNote"),
    purchase_order: t("sequences.types.purchaseOrder"),
    contact: t("sequences.types.contact"),
    product: t("sequences.types.product"),
  };

  const sequences = await db
    .select()
    .from(numberSequences)
    .where(eq(numberSequences.companyId, session.user.companyId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("sequences.title")}</h1>
        <p className="text-muted-foreground">{t("sequences.subtitle")}</p>
      </div>

      {/* Sequences table */}
      <div className="rounded-xl border bg-card">
        {sequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Hash className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{tc("noResults")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("numberSequencesDesc")}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{t("sequences.sequenceType")}</div>
              <div>{t("sequences.prefix")}</div>
              <div>{t("sequences.nextNumber")}</div>
              <div>{t("sequences.format")}</div>
              <div></div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {sequences.map((seq) => (
                <SequenceRow
                  key={seq.id}
                  sequence={{
                    id: seq.id,
                    type: seq.type,
                    prefix: seq.prefix,
                    nextNumber: seq.nextNumber,
                    format: seq.format,
                  }}
                  typeLabel={TYPE_LABELS[seq.type] || seq.type}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
