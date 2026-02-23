'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DashboardAlert } from '@kivvi/core/src/domain/dashboard';

interface AlertCardProps {
  alert: DashboardAlert;
}

export function AlertCard({ alert }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations('dashboard');

  const severityStyles = {
    urgent: {
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-900',
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/50',
      border: 'border-yellow-200 dark:border-yellow-900',
      icon: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200 dark:border-blue-900',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
  };

  const styles = severityStyles[alert.severity];

  const Icon =
    alert.severity === 'urgent'
      ? AlertCircle
      : alert.severity === 'warning'
        ? AlertTriangle
        : Info;

  // Extract items from metadata if available (for expandable alerts)
  const items = alert.metadata?.products || alert.metadata?.breakdown || [];
  const showExpandButton = items.length > 3;
  const displayItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="font-semibold">{t(alert.titleKey)}</h3>
            <p className="text-sm text-muted-foreground">{t(alert.descriptionKey, alert.descriptionParams)}</p>
          </div>

          {alert.amount !== undefined && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}>
                {formatCurrency(alert.amount)}
              </span>
              {alert.count && (
                <span className="text-xs text-muted-foreground">
                  {alert.count} {alert.count === 1 ? t('alerts.item') : t('alerts.items')}
                </span>
              )}
            </div>
          )}

          {/* Expandable items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-1">
                {displayItems.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-md border bg-card/50 p-2 text-sm"
                  >
                    {item.name || item.type} {item.articleNumber && `(${item.articleNumber})`}
                    {item.count && ` - ${item.count} items`}
                  </div>
                ))}
              </div>
              {showExpandButton && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      {t('alerts.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      {t('alerts.showMore', { count: items.length - 3 })}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={alert.linkTo}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('alerts.viewDetails')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
