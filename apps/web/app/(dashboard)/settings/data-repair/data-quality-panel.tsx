"use client";

import { useState } from "react";
import {
  Users,
  FileText,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DataQualityReport } from "@kivvi/core/src/domain/data-quality";
import { getDataQualityReportAction } from "@/app/actions/data-quality";
import { DataQualitySection } from "./data-quality-section";
import { DuplicateGroup } from "./duplicate-group";
import { DocumentIssuesTable } from "./document-issues-table";
import { ContactIssuesTable } from "./contact-issues-table";
import { ProductIssuesTable } from "./product-issues-table";

export function DataQualityPanel({
  initialReport,
}: {
  initialReport: DataQualityReport | null;
}) {
  const tDQ = useTranslations("dataQuality");
  const [report, setReport] = useState<DataQualityReport | null>(initialReport);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    const result = await getDataQualityReportAction();
    if (result.success) setReport(result.data!);
    setRefreshing(false);
  }

  if (!report) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
        <p>{tDQ("loadError")}</p>
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {summary.total === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning" />
          )}
          <span className="font-medium">
            {summary.total === 0
              ? tDQ("noProblemsFound")
              : tDQ("problemsFound", { count: summary.total })}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {tDQ("checkAgain")}
        </button>
      </div>

      {/* Duplicates */}
      <DataQualitySection
        icon={Users}
        title={tDQ("duplicateContactsTitle")}
        count={summary.duplicateContactGroups}
      >
        {report.duplicateContactGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tDQ("noDuplicates")}</p>
        ) : (
          <div className="space-y-4">
            {report.duplicateContactGroups.map((group) => (
              <DuplicateGroup
                key={group.normalizedName}
                group={group}
                onMerged={refresh}
              />
            ))}
          </div>
        )}
      </DataQualitySection>

      {/* Contact issues */}
      <DataQualitySection
        icon={Users}
        title={tDQ("contactIssuesTitle")}
        count={summary.contactIssues}
      >
        {report.contactIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allContactsOk")}
          </p>
        ) : (
          <ContactIssuesTable issues={report.contactIssues} onFixed={refresh} />
        )}
      </DataQualitySection>

      {/* Document issues */}
      <DataQualitySection
        icon={FileText}
        title={tDQ("documentIssuesTitle")}
        count={summary.documentIssues}
      >
        {report.documentIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allDocumentsOk")}
          </p>
        ) : (
          <DocumentIssuesTable
            issues={report.documentIssues}
            onFixed={refresh}
          />
        )}
      </DataQualitySection>

      {/* Product issues */}
      <DataQualitySection
        icon={Package}
        title={tDQ("productIssuesTitle")}
        count={summary.productIssues}
      >
        {report.productIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tDQ("allProductsOk")}
          </p>
        ) : (
          <ProductIssuesTable issues={report.productIssues} />
        )}
      </DataQualitySection>
    </div>
  );
}
