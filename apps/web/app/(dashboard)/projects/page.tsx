import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Search, FolderKanban, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listProjects } from '@kivvi/core';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { PROJECT_STATUS_STYLES as STATUS_STYLES } from '@/lib/config/project-status';
import { DEFAULT_PAGE_SIZE } from '@/lib/config/document-types';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const t = await getTranslations('projects');
  const tc = await getTranslations('common');

  const STATUS_LABELS: Record<string, string> = {
    active: t('statusActive'),
    completed: t('statusCompleted'),
    on_hold: t('statusOnHold'),
    cancelled: t('statusCancelled'),
  };

  const params = await searchParams;
  const search = params.search || '';
  const statusFilter = params.status as 'active' | 'completed' | 'on_hold' | 'cancelled' | undefined;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const result = await listProjects(db, session.user.companyId, {
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newProject')}
        </Link>
      </div>

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
            placeholder={t('searchProjects')}
            defaultValue={search}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <StatusFilterLink
            href={buildFilterUrl({ search, status: undefined })}
            active={!statusFilter}
            label={tc('all')}
          />
          <StatusFilterLink
            href={buildFilterUrl({ search, status: 'active' })}
            active={statusFilter === 'active'}
            label={t('statusActive')}
          />
          <StatusFilterLink
            href={buildFilterUrl({ search, status: 'completed' })}
            active={statusFilter === 'completed'}
            label={t('statusCompleted')}
          />
          <StatusFilterLink
            href={buildFilterUrl({ search, status: 'on_hold' })}
            active={statusFilter === 'on_hold'}
            label={t('statusOnHold')}
          />
          <StatusFilterLink
            href={buildFilterUrl({ search, status: 'cancelled' })}
            active={statusFilter === 'cancelled'}
            label={t('statusCancelled')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t('noProjects')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || statusFilter
                ? t('adjustFilters')
                : t('createFirstProject')}
            </p>
            {!search && !statusFilter && (
              <Link
                href="/projects/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newProject')}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('name')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{t('client')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{tc('status')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-right">{t('budget')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{t('startDate')}</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">{t('endDate')}</th>
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
                        {project.contactName || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_STYLES[project.status ?? 'active'] || ''
                          )}
                        >
                          {STATUS_LABELS[project.status ?? 'active'] || project.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                        {project.budget
                          ? formatCurrency(Number(project.budget))
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {project.startDate ? formatDate(project.startDate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {project.endDate ? formatDate(project.endDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {t('showingProjects', {
                    from: (result.page - 1) * result.pageSize + 1,
                    to: Math.min(result.page * result.pageSize, result.total),
                    total: result.total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {result.page > 1 ? (
                    <Link
                      href={buildFilterUrl({
                        search,
                        status: statusFilter,
                        page: result.page - 1,
                      })}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {tc('previous')}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      <ChevronLeft className="h-4 w-4" />
                      {tc('previous')}
                    </span>
                  )}

                  <span className="px-2 text-sm text-muted-foreground">
                    {t('pageOf', { page: result.page, totalPages: result.totalPages })}
                  </span>

                  {result.page < result.totalPages ? (
                    <Link
                      href={buildFilterUrl({
                        search,
                        status: statusFilter,
                        page: result.page + 1,
                      })}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {tc('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
                      {tc('next')}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
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
          ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm'
          : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
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
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.page && params.page > 1) searchParams.set('page', String(params.page));
  const qs = searchParams.toString();
  return `/projects${qs ? `?${qs}` : ''}`;
}
