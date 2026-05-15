import Link from "next/link";
import { Plus, Search, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listProjects } from "@kivvi/core";
import { cn, formatCurrency, formatDate, paginationRange } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import {
  PROJECT_STATUS_STYLES as STATUS_STYLES,
  PROJECT_STATUS_LABEL_KEYS,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/lib/config/project-status";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");

  const params = await searchParams;
  const search = params.search || "";
  const rawStatus = params.status;
  const statusFilter: ProjectStatus | undefined =
    rawStatus && (PROJECT_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as ProjectStatus)
      : undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const result = await listProjects(db, session.user.companyId, {
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("newProject")}
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form className="relative flex-1" action="/projects" method="GET">
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder={t("searchProjects")}
            defaultValue={search}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>

        {/* Status filter — derived from PROJECT_STATUSES SSOT */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <StatusFilterLink
            href={buildFilterUrl({ search, status: undefined })}
            active={!statusFilter}
            label={tc("all")}
          />
          {PROJECT_STATUSES.map((status) => (
            <StatusFilterLink
              key={status}
              href={buildFilterUrl({ search, status })}
              active={statusFilter === status}
              label={t(
                PROJECT_STATUS_LABEL_KEYS[status] as Parameters<typeof t>[0],
              )}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <EmptyState
            icon={search || statusFilter ? Search : FolderKanban}
            title={
              search || statusFilter ? t("adjustFilters") : t("noProjects")
            }
            description={
              search || statusFilter
                ? t("adjustFilters")
                : t("createFirstProject")
            }
            actionLabel={!search && !statusFilter ? t("newProject") : undefined}
            actionHref={!search && !statusFilter ? "/projects/new" : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {tc("name")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("client")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {tc("status")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">
                      {t("budget")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("startDate")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("endDate")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.data.map((project) => (
                    <tr
                      key={project.id}
                      className="group transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        {project.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {project.contactName || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_STYLES[project.status ?? "active"] || "",
                          )}
                        >
                          {t(
                            PROJECT_STATUS_LABEL_KEYS[
                              (project.status ??
                                "active") as keyof typeof PROJECT_STATUS_LABEL_KEYS
                            ] || "statusActive",
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                        {project.budget ? formatCurrency(project.budget) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {project.startDate
                          ? formatDate(project.startDate)
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {project.endDate ? formatDate(project.endDate) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={(p) =>
                buildFilterUrl({ search, status: statusFilter, page: p })
              }
              labels={{
                showing: tc(
                  "showing",
                  paginationRange(result.page, result.pageSize, result.total),
                ),
                previous: tc("previous"),
                next: tc("next"),
                pageOf: tc("pageOf", {
                  page: result.page,
                  totalPages: result.totalPages,
                }),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusFilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
          : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

// ============================================================================
// URL BUILDER
// ============================================================================

function buildFilterUrl(params: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.page && params.page > 1)
    searchParams.set("page", String(params.page));
  const qs = searchParams.toString();
  return `/projects${qs ? `?${qs}` : ""}`;
}
