import { notFound } from "next/navigation";
import Link from "next/link";
import { Tags, FileText, Package, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getDocument, listInventoryItems } from "@kivvi/core";
import { DOCUMENT_TYPES, STATUS } from "@/lib/config/document-types";
import { DocumentDetail } from "@/components/documents/document-detail";
import { isValidUUID, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  getStatusStyle,
  getConditionStyle,
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";
import type { ChecklistData } from "@kivvi/core/src/config/checklist-templates";
import { SendReceiptButton } from "./send-receipt-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IntakeDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const doc = await getDocument(db, session.user.companyId, id);

  if (!doc || doc.type !== "intake") notFound();

  const ti = await getTranslations("inventory");
  const isConfirmed =
    doc.status !== STATUS.DRAFT && doc.status !== STATUS.CANCELLED;

  // Fetch all linked items (intake batches are bounded in size)
  const linkedItems = isConfirmed
    ? await listInventoryItems(db, session.user.companyId, {
        intakeDocumentId: id,
        pageSize: 500,
        sortBy: "createdAt",
        sortOrder: "asc",
      })
    : null;

  const hasItems = (linkedItems?.total ?? 0) > 0;

  const draftItemCount = doc.items.reduce(
    (sum, item) =>
      sum + Math.max(1, Math.floor(parseFloat(item.quantity || "1"))),
    0,
  );

  return (
    <div className="space-y-6">
      <DocumentDetail doc={doc} config={DOCUMENT_TYPES.intake} />

      {/* Draft hint: show expected item count before confirmation */}
      {!isConfirmed && doc.status !== "cancelled" && doc.items.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {ti("confirmIntakeFirst")}{" "}
              <span className="font-medium text-foreground">
                {ti("willCreateItems", { count: draftItemCount })}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Intake-specific actions — shown after confirmation */}
      {isConfirmed && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {ti("itemsTitle")}
              {hasItems && (
                <span className="ml-2 text-foreground font-semibold">
                  ({linkedItems?.total})
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              {hasItems && (
                <Link
                  href={`/intake/${id}/labels`}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Tags className="h-3.5 w-3.5" />
                  {ti("printLabels")}
                </Link>
              )}
              {doc.intakeSource === "donation" && (
                <>
                  <a
                    href={`/api/intake/${id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {ti("donationReceipt")}
                  </a>
                  <SendReceiptButton intakeId={id} />
                </>
              )}
            </div>
          </div>

          {!hasItems ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {ti("noItemsFound")}
              </p>
              <Link
                href={`/intake/quick?intakeDocumentId=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {ti("addItem")}
              </Link>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {linkedItems?.data.map((item) => {
                const cd = item.checklistData as ChecklistData | null;
                let qcProgress:
                  | { done: number; total: number; signedOff: boolean }
                  | undefined;
                if (cd?.completions?.length && item.category) {
                  const template = getChecklistTemplate(item.category);
                  const requiredTotal = template.checks.filter(
                    (c) => c.required,
                  ).length;
                  const done = cd.completions.filter(
                    (c) => c.result === "pass",
                  ).length;
                  qcProgress = {
                    done,
                    total: requiredTotal,
                    signedOff: !!cd.signedOffAt,
                  };
                }

                return (
                  <Link
                    key={item.id}
                    href={`/intake/items/${item.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      {item.photoBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoBase64}
                          alt={item.description}
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </div>

                    {/* Description + number */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.description}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {item.itemNumber}
                        </span>
                        {qcProgress && (
                          <span
                            className={cn(
                              "text-xs",
                              qcProgress.signedOff
                                ? "text-success font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {qcProgress.signedOff
                              ? `· ${ti("qcSignedOff")}`
                              : `· ${ti("qcProgress", { done: qcProgress.done, total: qcProgress.total })}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Condition badge */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        getConditionStyle(item.condition),
                      )}
                    >
                      {ti(getConditionLabelKey(item.condition))}
                    </span>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        getStatusStyle(item.status),
                      )}
                    >
                      {ti(getStatusLabelKey(item.status))}
                    </span>

                    {/* Price */}
                    <div className="shrink-0 w-20 text-right text-sm tabular-nums text-muted-foreground">
                      {item.askingPrice
                        ? formatCurrency(item.askingPrice)
                        : "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
