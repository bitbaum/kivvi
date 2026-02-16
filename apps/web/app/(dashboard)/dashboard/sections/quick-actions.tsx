'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Receipt,
  CreditCard,
  UserPlus,
  Package,
  Upload,
  MessageSquare,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DEFAULT_DASHBOARD_CONFIG } from '@/lib/config/dashboard-config';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

export function QuickActions() {
  const [showAll, setShowAll] = useState(false);
  const t = useTranslations('dashboard.quickActions');

  const actions: QuickAction[] = [
    {
      label: t('createInvoice'),
      href: '/sales/invoices/new',
      icon: <FileText className="h-6 w-6" />,
      description: t('createInvoiceDesc'),
    },
    {
      label: t('createQuote'),
      href: '/sales/quotes/new',
      icon: <Receipt className="h-6 w-6" />,
      description: t('createQuoteDesc'),
    },
    {
      label: t('createOrder'),
      href: '/sales/orders/new',
      icon: <ShoppingCart className="h-6 w-6" />,
      description: t('createOrderDesc'),
    },
    {
      label: t('recordPayment'),
      href: '/sales/invoices?action=payment',
      icon: <CreditCard className="h-6 w-6" />,
      description: t('recordPaymentDesc'),
    },
    {
      label: t('addContact'),
      href: '/contacts/new',
      icon: <UserPlus className="h-6 w-6" />,
      description: t('addContactDesc'),
    },
    {
      label: t('addProduct'),
      href: '/products/new',
      icon: <Package className="h-6 w-6" />,
      description: t('addProductDesc'),
    },
    {
      label: t('importData'),
      href: '/settings/import',
      icon: <Upload className="h-6 w-6" />,
      description: t('importDataDesc'),
    },
    {
      label: t('openAIChat'),
      href: '/chat',
      icon: <MessageSquare className="h-6 w-6" />,
      description: t('openAIChatDesc'),
    },
  ];

  const displayedActions = showAll
    ? actions
    : actions.slice(0, DEFAULT_DASHBOARD_CONFIG.maxQuickActions);

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {actions.length > DEFAULT_DASHBOARD_CONFIG.maxQuickActions && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={showAll}
            aria-controls="quick-actions-grid"
          >
            {showAll ? (
              <>
                <span>{t('showLess')}</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>{t('showAll')}</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
      <div
        id="quick-actions-grid"
        className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {displayedActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            aria-label={`${action.label}: ${action.description}`}
            className="group flex min-h-[44px] flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {action.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium leading-tight">{action.label}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
