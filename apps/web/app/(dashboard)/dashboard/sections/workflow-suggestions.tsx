import { getWorkflowSuggestions } from '@kivvi/core/src/domain/dashboard';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { DEFAULT_DASHBOARD_CONFIG } from '@/lib/config/dashboard-config';
import {
  ArrowRight,
  FileText,
  ShoppingCart,
  Truck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export async function WorkflowSuggestions() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;
  const suggestions = await getWorkflowSuggestions(db, companyId);

  const t = await getTranslations('dashboard');

  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">{t('workflow.noSuggestions')}</h3>
        <p className="text-sm text-muted-foreground">{t('workflow.checkBackLater')}</p>
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'convert_quote':
        return <FileText className="h-5 w-5" />;
      case 'invoice_order':
        return <ShoppingCart className="h-5 w-5" />;
      case 'confirm_delivery':
        return <Truck className="h-5 w-5" />;
      case 'start_dunning':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <ArrowRight className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (priority === 2) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return t('workflow.highPriority');
    if (priority === 2) return t('workflow.mediumPriority');
    return t('workflow.lowPriority');
  };

  // Group top suggestions by priority (limit configured in dashboard-config)
  const topSuggestions = suggestions.slice(
    0,
    DEFAULT_DASHBOARD_CONFIG.maxWorkflowSuggestions
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('workflow.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('workflow.subtitle')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {topSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={cn(
              'group rounded-xl border bg-card p-4 transition-colors hover:bg-accent',
              suggestion.priority === 1 &&
                'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-900/10'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {getIconForType(suggestion.type)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium leading-tight">{t(suggestion.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.entityNumber}
                      {suggestion.contactName && ` • ${suggestion.contactName}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(suggestion.priority)}`}
                  >
                    {getPriorityLabel(suggestion.priority)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(suggestion.descriptionKey, suggestion.descriptionParams)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(suggestion.amount)}
                  </span>
                  <Link
                    href={suggestion.actionUrl}
                    aria-label={`${t(suggestion.actionLabelKey)} for ${suggestion.entityNumber}`}
                    className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  >
                    {t(suggestion.actionLabelKey)}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
