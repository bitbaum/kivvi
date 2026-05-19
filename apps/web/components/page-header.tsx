import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

interface DetailPageHeaderProps {
  /** Breadcrumb trail — last item is the current page (no href needed) */
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  /** Back link href (first breadcrumb parent) */
  backHref: string;
  /** Status badge or other inline elements next to the title */
  badge?: React.ReactNode;
  /** Action buttons (edit, delete, etc.) */
  actions?: React.ReactNode;
}

/**
 * Consistent header for detail and edit pages.
 * Provides breadcrumb navigation, back button, title, and action area.
 */
export function DetailPageHeader({
  breadcrumbs,
  title,
  subtitle,
  backHref,
  badge,
  actions,
}: DetailPageHeaderProps) {
  return (
    <div className="space-y-2">
      <Breadcrumb items={breadcrumbs} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            href={backHref}
            className="mt-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1>{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
