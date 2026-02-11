import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  FileText,
  DollarSign,
  Receipt,
  Calendar,
  User,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getProject, getProjectDocuments, getProjectSummary } from '@kivvi/core';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { ProjectEditForm } from './edit-form';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: 'Quote',
  order: 'Order',
  order_confirmation: 'Order Confirmation',
  delivery_note: 'Delivery Note',
  invoice: 'Invoice',
  credit_note: 'Credit Note',
  purchase_order: 'Purchase Order',
  purchase_invoice: 'Purchase Invoice',
  dunning: 'Dunning',
};

const DOC_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const { id } = await params;
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
      ? Math.min(
          100,
          Math.round((summary.totalInvoiced / Number(project.budget)) * 100)
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/projects"
            className="mt-1 rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1 text-xs font-medium',
                  STATUS_STYLES[project.status ?? 'active'] || ''
                )}
              >
                {STATUS_LABELS[project.status ?? 'active'] || project.status}
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Documents
          </div>
          <p className="mt-2 text-3xl font-bold">{summary.totalDocuments}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            Total Invoiced
          </div>
          <p className="mt-2 text-3xl font-bold">
            {formatCurrency(summary.totalInvoiced)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Revenue (Paid)
          </div>
          <p className="mt-2 text-3xl font-bold">
            {formatCurrency(summary.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Budget progress */}
          {project.budget && Number(project.budget) > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">Budget</h2>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {formatCurrency(summary.totalInvoiced)} of{' '}
                  {formatCurrency(Number(project.budget))}
                </span>
                <span className="font-medium">{budgetUsedPercent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    budgetUsedPercent !== null && budgetUsedPercent >= 100
                      ? 'bg-red-500'
                      : budgetUsedPercent !== null && budgetUsedPercent >= 80
                        ? 'bg-yellow-500'
                        : 'bg-primary'
                  )}
                  style={{ width: `${budgetUsedPercent || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">Description</h2>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Linked Documents */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b px-6 py-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Linked Documents</h2>
            </div>
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No documents linked to this project yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Number</th>
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono">
                          {doc.number}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {doc.contactName || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatDate(doc.issueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                              DOC_STATUS_STYLES[doc.status] || DOC_STATUS_STYLES.draft
                            )}
                          >
                            {doc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                          {formatCurrency(Number(doc.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <ProjectEditForm
            projectId={project.id}
            initialData={{
              name: project.name,
              description: project.description || '',
              contactId: project.contactId || '',
              status: project.status ?? 'active',
              budget: project.budget ? String(project.budget) : '',
              startDate: project.startDate
                ? new Date(project.startDate).toISOString().split('T')[0]
                : '',
              endDate: project.endDate
                ? new Date(project.endDate).toISOString().split('T')[0]
                : '',
            }}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Client Info */}
          {project.contactName && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Client
              </h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{project.contactName}</p>
              </div>
              <Link
                href={`/contacts/${project.contactId}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                View contact
              </Link>
            </div>
          )}

          {/* Project Details */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Details
              </h2>
            </div>
            <div className="divide-y">
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_STYLES[project.status ?? 'active'] || ''
                  )}
                >
                  {STATUS_LABELS[project.status ?? 'active'] || project.status}
                </span>
              </div>
              {project.budget && (
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-muted-foreground">Budget</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(Number(project.budget))}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Start Date</span>
                <span className="text-sm">
                  {project.startDate ? formatDate(project.startDate) : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">End Date</span>
                <span className="text-sm">
                  {project.endDate ? formatDate(project.endDate) : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{formatDate(project.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-sm">{formatDate(project.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
