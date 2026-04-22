import Link from "next/link";
import { Wrench, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listInventoryItems } from "@kivvi/core";
import { PageHeader } from "@/components/page-header";
import { cn, formatDate } from "@/lib/utils";
import {
  getConditionStyle,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";

function daysAgo(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function ageClass(days: number): string {
  if (days >= 14) return "text-destructive font-semibold";
  if (days >= 7) return "text-warning font-medium";
  return "text-muted-foreground";
}

export default async function RepairQueuePage() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const tc = await getTranslations("common");

  const allRepairResult = await listInventoryItems(db, session.user.companyId, {
    status: "repair",
    pageSize: 500,
    sortBy: "createdAt",
    sortOrder: "asc",
  });

  const unassignedItems = allRepairResult.data.filter(
    (item) => item.assignedToUserId === null,
  );
  const assignedItems = allRepairResult.data.filter(
    (item) => item.assignedToUserId !== null,
  );

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
                    <Link
                      key={item.id}
                      href={`/intake/items/${item.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {item.itemNumber}
                          </span>
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
                        {item.repairCost && parseFloat(item.repairCost) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            CHF {parseFloat(item.repairCost).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
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
                    <Link
                      key={item.id}
                      href={`/intake/items/${item.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {item.itemNumber}
                          </span>
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
                        {item.assignedToName && (
                          <p className="text-xs text-muted-foreground">
                            {item.assignedToName}
                          </p>
                        )}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </Link>
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
