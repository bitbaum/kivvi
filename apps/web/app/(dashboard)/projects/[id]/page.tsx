import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, DollarSign, Receipt, ShoppingCart } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getProject, getProjectDocuments, getProjectSummary } from "@kivvi/core";
import { cn, formatCurrency, isValidUUID } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import {
  PROJECT_STATUS_STYLES as STATUS_STYLES,
  PROJECT_STATUS_LABEL_KEYS,
} from "@/lib/config/project-status";
import { ProjectEditForm } from "./edit-form";
import { QuickActionsBar, type QuickAction } from "@/components/quick-actions-bar";
import { ProjectLinkedDocuments } from "./project-linked-documents";
import { ProjectDetailSidebar } from "./project-detail-sidebar";
import { RecentItemTracker } from "@/components/recent-item-tracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");

  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const companyId = session.user.companyId;

  const [project, documents, summary] = await Promise.all([
    getProject(db, companyId, id),
    getProjectDocuments(db, companyId, id),
    getProjectSummary(db, companyId, id),
  ]);

  if (!project) {
    notFound();
  }

  const budgetUsedPercent =
    project.budget && Number(project.budget) > 0
      ? Math.min(100, Math.round((summary.totalInvoiced / Number(project.budget)) * 100))
      : null;

  return (
    <div className="space-y-6">
      <RecentItemTracker
        id={project.id}
        type="project"
        label={project.name}
        href={`/projects/${project.id}`}
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/projects"
            className="mt-1 min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-xs font-medium",
                  STATUS_STYLES[project.status ?? "active"] || "",
                )}
              >
                {t(
                  PROJECT_STATUS_LABEL_KEYS[
                    (project.status ?? "active") as keyof typeof PROJECT_STATUS_LABEL_KEYS
                  ] || "statusActive",
                )}
              </span>
            </div>
            {project.contactName && (
              <Link
                href={`/contacts/${project.contactId}`}
                className="text-muted-foreground hover:underline"
              >
                {project.contactName}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsBar actions={buildProjectQuickActions(project, t)} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {t("documents")}
          </div>
          <p className="mt-2 text-3xl font-bold">{summary.totalDocuments}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            {t("totalInvoiced")}
          </div>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(summary.totalInvoiced)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {t("revenuePaid")}
          </div>
          <p className="mt-2 text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget progress */}
          {project.budget && Number(project.budget) > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">{t("budget")}</h2>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {t("budgetProgress", {
                    used: formatCurrency(summary.totalInvoiced),
                    total: formatCurrency(project.budget),
                  })}
                </span>
                <span className="font-medium">{budgetUsedPercent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    budgetUsedPercent !== null && budgetUsedPercent >= 100
                      ? "bg-destructive/50"
                      : budgetUsedPercent !== null && budgetUsedPercent >= 80
                        ? "bg-warning/50"
                        : "bg-primary",
                  )}
                  style={{ width: `${budgetUsedPercent || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">{tc("description")}</h2>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          <ProjectLinkedDocuments documents={documents} />

          {/* Edit Form */}
          <ProjectEditForm
            projectId={project.id}
            initialData={{
              name: project.name,
              description: project.description || "",
              contactId: project.contactId || "",
              status: project.status ?? "active",
              budget: project.budget ? String(project.budget) : "",
              startDate: project.startDate
                ? new Date(project.startDate).toISOString().split("T")[0]
                : "",
              endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
            }}
          />
        </div>

        {/* Right column */}
        <ProjectDetailSidebar project={project} />
      </div>
    </div>
  );
}

function buildProjectQuickActions(
  project: { id: string; contactId: string | null; contactName: string | null },
  t: (key: string) => string,
): QuickAction[] {
  const params = new URLSearchParams();
  params.set("projectId", project.id);
  if (project.contactId) params.set("contactId", project.contactId);
  if (project.contactName) params.set("contactName", project.contactName);
  const qs = params.toString();

  return [
    {
      label: t("createQuote"),
      href: `/sales/quotes/new?${qs}`,
      icon: <Receipt className="h-4 w-4" />,
      variant: "primary",
    },
    {
      label: t("createInvoice"),
      href: `/sales/invoices/new?${qs}`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: t("createOrder"),
      href: `/sales/orders/new?${qs}`,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
  ];
}
