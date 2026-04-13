import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listFiscalYears } from "@kivvi/core";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { NewYearForm } from "./new-year-form";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";

export default async function FiscalYearsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const fiscalYears = await listFiscalYears(db, session.user.companyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("fiscalYears")}</h1>
          <p className="text-muted-foreground">{t("manageFiscalYears")}</p>
        </div>
      </div>

      {/* Create form */}
      <NewYearForm />

      {/* List */}
      <div className="rounded-xl border bg-card">
        {fiscalYears.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t("noFiscalYears")}
            description={t("manageFiscalYears")}
          />
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>{tc("name")}</div>
              <div>{t("startDate")}</div>
              <div>{t("endDate")}</div>
              <div>{tc("status")}</div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {fiscalYears.map((year) => (
                <Link
                  key={year.id}
                  href={`/accounting/fiscal-years/${year.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="text-sm font-medium">{year.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(year.startDate)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(year.endDate)}
                  </div>
                  <div>
                    <StatusBadge
                      variant={year.isClosed ? "inactive" : "active"}
                      label={year.isClosed ? t("closed") : t("open")}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
