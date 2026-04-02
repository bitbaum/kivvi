import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getFiscalYear } from "@kivvi/core";
import { formatDate, isValidUUID } from "@/lib/utils";
import { CloseYearButton, ClosePeriodButton } from "./close-buttons";
import { StatusBadge } from "@/components/status-badge";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FiscalYearDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const fiscalYear = await getFiscalYear(db, session.user.companyId, id);

  if (!fiscalYear) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/accounting/fiscal-years"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")} {t("fiscalYears")}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{fiscalYear.name}</h1>
              <StatusBadge
                variant={fiscalYear.isClosed ? "inactive" : "active"}
                label={fiscalYear.isClosed ? t("closed") : t("open")}
              />
            </div>
            <p className="mt-1 text-muted-foreground">
              {formatDate(fiscalYear.startDate)} &ndash;{" "}
              {formatDate(fiscalYear.endDate)}
            </p>
          </div>

          {!fiscalYear.isClosed && (
            <CloseYearButton
              yearId={fiscalYear.id}
              yearName={fiscalYear.name}
            />
          )}
        </div>
      </div>

      {/* Periods table */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("periods")} ({fiscalYear.periods.length})
          </h2>
        </div>

        {fiscalYear.periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noPeriods")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    {tc("name")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    {t("startDate")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    {t("endDate")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium">
                    {tc("status")}
                  </th>
                  <th className="whitespace-nowrap px-6 py-3 font-medium text-right">
                    {tc("edit")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fiscalYear.periods.map((period) => (
                  <tr key={period.id}>
                    <td className="whitespace-nowrap px-6 py-4 font-medium">
                      {period.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                      {formatDate(period.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                      {formatDate(period.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge
                        variant={period.isClosed ? "inactive" : "active"}
                        label={period.isClosed ? t("closed") : t("open")}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      {!period.isClosed && !fiscalYear.isClosed && (
                        <ClosePeriodButton
                          periodId={period.id}
                          periodName={period.name}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
