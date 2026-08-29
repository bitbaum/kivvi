import Decimal from "decimal.js";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { listInventoryItems } from "@kivvi/core";
import { PageHeader } from "@/components/page-header";
import { cn, formatCurrency } from "@/lib/utils";
import { getConditionStyle, getConditionLabelKey } from "@/lib/config/inventory-items";
import { PIPELINE_THRESHOLDS } from "@kivvi/core/src/config/pipeline-thresholds";
import { RepairQueueAssignButton } from "@/components/inventory/repair-queue-assign-button";
import { RepairQueueDoneButton } from "@/components/inventory/repair-queue-done-button";

function daysAgo(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function ageClass(days: number): string {
  if (days >= PIPELINE_THRESHOLDS.repair.alert) return "text-destructive font-semibold";
  if (days >= PIPELINE_THRESHOLDS.repair.warn) return "text-warning font-medium";
  return "text-muted-foreground";
}

export default async function RepairQueuePage() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const tc = await getTranslations("common");

  const [allRepairResult, companyUsers] = await Promise.all([
    listInventoryItems(db, session.user.companyId, {
      status: "repair",
      pageSize: 500,
      sortBy: "createdAt",
      sortOrder: "asc",
    }),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.companyId, session.user.companyId)),
  ]);

  const userOptions = companyUsers.map((u) => ({
    id: u.id,
    label: u.name ?? u.id,
  }));

  const unassignedItems = allRepairResult.data.filter((item) => item.assignedToUserId === null);
  const assignedItems = allRepairResult.data.filter((item) => item.assignedToUserId !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ti("repairQueue")}
        subtitle={ti("repairQueueDesc")}
        actions={
          <Link
            href="/intake/items?status=repair"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {tc("viewAll")}
          </Link>
        }
      />

      {allRepairResult.data.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Wrench className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{ti("noRepairItems")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unassigned */}
          {unassignedItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-warning/10 text-warning text-xs font-bold">
                  {unassignedItems.length}
                </span>
                {ti("unassignedItems")}
              </h2>
              <div className="rounded-xl border bg-card divide-y">
                {unassignedItems.map((item) => {
                  const days = daysAgo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Link
                        href={`/intake/items/${item.id}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-label={item.description}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.itemNumber}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              getConditionStyle(item.condition),
                            )}
                          >
                            {ti(getConditionLabelKey(item.condition))}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn("text-xs", ageClass(days))}>
                          {ti("ageInRepair", { days })}
                        </span>
                        {item.effectiveCost && new Decimal(item.effectiveCost).gt(0) && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.effectiveCost)}
                          </p>
                        )}
                      </div>
                      <div className="relative z-10">
                        <RepairQueueDoneButton itemId={item.id} />
                      </div>
                      <div className="relative z-10">
                        <RepairQueueAssignButton
                          itemId={item.id}
                          assignedToUserId={item.assignedToUserId ?? null}
                          assignedToName={item.assignedToName ?? null}
                          companyUsers={userOptions}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Assigned */}
          {assignedItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-info/10 text-info text-xs font-bold">
                  {assignedItems.length}
                </span>
                {ti("assignedTo")}
              </h2>
              <div className="rounded-xl border bg-card divide-y">
                {assignedItems.map((item) => {
                  const days = daysAgo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <Link
                        href={`/intake/items/${item.id}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-label={item.description}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{item.itemNumber}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              getConditionStyle(item.condition),
                            )}
                          >
                            {ti(getConditionLabelKey(item.condition))}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn("text-xs", ageClass(days))}>
                          {ti("ageInRepair", { days })}
                        </span>
                        {item.effectiveCost && new Decimal(item.effectiveCost).gt(0) && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.effectiveCost)}
                          </p>
                        )}
                      </div>
                      <div className="relative z-10">
                        <RepairQueueDoneButton itemId={item.id} />
                      </div>
                      <div className="relative z-10">
                        <RepairQueueAssignButton
                          itemId={item.id}
                          assignedToUserId={item.assignedToUserId ?? null}
                          assignedToName={item.assignedToName ?? null}
                          companyUsers={userOptions}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
