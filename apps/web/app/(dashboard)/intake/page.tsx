import Link from "next/link";
import { Package, Wrench, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { listDocuments, getInventoryItemCounts } from "@kivvi/core";
import { db } from "@/lib/db";
import { DOCUMENT_TYPES, DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { DocumentList } from "@/components/documents/document-list";
import { cn } from "@/lib/utils";
import type { DocumentStatus, IntakeSourceValue } from "@kivvi/database";
import { INTAKE_SOURCE_VALUES } from "@kivvi/database";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    intakeSource?: string;
    page?: string;
  }>;
}

const INTAKE_SOURCE_LABEL_KEYS: Record<IntakeSourceValue, string> = {
  donation: "intakeSourceDonation",
  purchase: "intakeSourcePurchase",
  trade_in: "intakeSourceTradeIn",
  consignment: "intakeSourceConsignment",
  estate_clearance: "intakeSourceEstate",
  return: "intakeSourceReturn",
  other: "intakeSourceOther",
};

export default async function IntakePage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status as DocumentStatus | undefined;
  const search = params.search;
  const intakeSource =
    params.intakeSource &&
    (INTAKE_SOURCE_VALUES as readonly string[]).includes(params.intakeSource)
      ? (params.intakeSource as IntakeSourceValue)
      : undefined;

  const result = await listDocuments(db, session.user.companyId, {
    type: "intake",
    status,
    intakeSource,
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "issueDate",
    sortOrder: "desc",
  });

  const tc = await getTranslations("common");
  const ti = await getTranslations("inventory");
  const td = await getTranslations("documents");
  const counts = await getInventoryItemCounts(db, session.user.companyId);
  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const repairCount = counts.repair ?? 0;

  function sourcePillHref(src: IntakeSourceValue | null) {
    const base = "/intake";
    const parts: string[] = [];
    if (status) parts.push(`status=${status}`);
    if (search) parts.push(`search=${search}`);
    if (src) parts.push(`intakeSource=${src}`);
    return parts.length ? `${base}?${parts.join("&")}` : base;
  }

  const sourceFilterPills = (
    <div className="flex flex-wrap gap-2">
      <Link
        href={sourcePillHref(null)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          !intakeSource
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {tc("all")}
      </Link>
      {INTAKE_SOURCE_VALUES.map((src) => (
        <Link
          key={src}
          href={sourcePillHref(src)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            intakeSource === src
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {td(INTAKE_SOURCE_LABEL_KEYS[src] as Parameters<typeof td>[0])}
        </Link>
      ))}
    </div>
  );

  return (
    <DocumentList
      config={DOCUMENT_TYPES.intake}
      result={result}
      search={search}
      status={status}
      secondaryFilters={sourceFilterPills}
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/intake/quick"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            {ti("quickIntake")}
          </Link>
          <Link
            href="/intake/repair-queue"
            className={
              repairCount > 0
                ? "inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm font-medium text-warning hover:bg-warning/10 transition-colors dark:hover:bg-warning/20"
                : "inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            }
          >
            <Wrench className="h-4 w-4" />
            {repairCount > 0
              ? `${repairCount} ${ti("inRepair")}`
              : ti("repairQueue")}
          </Link>
          <Link
            href="/intake/items"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Package className="h-4 w-4" />
            {totalItems} {tc("items")}
          </Link>
        </div>
      }
    />
  );
}
