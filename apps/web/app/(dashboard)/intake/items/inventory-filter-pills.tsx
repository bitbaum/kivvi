import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/search-input";
import { ITEM_STATUS_VALUES, ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";
import { getStatusLabelKey, getConditionLabelKey } from "@/lib/config/inventory-items";

interface InventoryFilterPillsProps {
  search: string | undefined;
  status: string | undefined;
  condition: string | undefined;
  assignedTo: string | undefined;
  warehouseId: string | undefined;
  page: number;
  counts: Record<string, number>;
  conditionCounts: Record<string, number>;
  allWarehouses: { id: string; name: string }[];
  totalItems: number;
}

export async function InventoryFilterPills({
  search,
  status,
  condition,
  assignedTo,
  warehouseId,
  page,
  counts,
  conditionCounts,
  allWarehouses,
  totalItems,
}: InventoryFilterPillsProps) {
  const t = await getTranslations("common");
  const ti = await getTranslations("inventory");

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const values = {
      search,
      status,
      condition,
      assignedTo,
      warehouseId,
      page: String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(values)) {
      if (v) p.set(k, v);
    }
    return `/intake/items?${p.toString()}`;
  }

  return (
    <div className="space-y-3">
      <SearchInput basePath="/intake/items" placeholder={ti("searchItems")} />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref({ status: undefined, page: undefined })}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            !status
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {t("all")} ({totalItems})
        </Link>
        {ITEM_STATUS_VALUES.filter((s) => counts[s]).map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: undefined })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              status === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {ti(getStatusLabelKey(s))} ({counts[s]})
          </Link>
        ))}
        <div className="h-6 w-px bg-border self-center" />
        <Link
          href={buildHref({
            assignedTo: assignedTo === "me" ? undefined : "me",
            page: undefined,
          })}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            assignedTo === "me"
              ? "bg-warning text-warning-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          {ti("assignedToMe")}
        </Link>
      </div>

      {/* Condition filter pills */}
      {ITEM_CONDITION_VALUES.some((c) => conditionCounts[c]) && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ condition: undefined, page: undefined })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              !condition
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {t("allConditions")}
          </Link>
          {ITEM_CONDITION_VALUES.filter((c) => conditionCounts[c]).map((c) => (
            <Link
              key={c}
              href={buildHref({ condition: c, page: undefined })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                condition === c
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {ti(getConditionLabelKey(c))} ({conditionCounts[c]})
            </Link>
          ))}
        </div>
      )}

      {/* Warehouse filter pills */}
      {allWarehouses.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ warehouseId: undefined, page: undefined })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              !warehouseId
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {ti("allWarehouses")}
          </Link>
          {allWarehouses.map((w) => (
            <Link
              key={w.id}
              href={buildHref({ warehouseId: w.id, page: undefined })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                warehouseId === w.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {w.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
