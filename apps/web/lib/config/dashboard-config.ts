/**
 * Dashboard Configuration
 * SSOT for all dashboard behavior and display settings
 */

export interface QuickActionConfig {
  id: string;
  translationKey: string;
  href: string;
  icon: string;
  order: number;
}

export interface DashboardConfig {
  quickActions: QuickActionConfig[];
  defaultVisibleStats: string[];
  maxWorkflowSuggestions: number;
  maxQuickActions: number;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  quickActions: [
    {
      id: 'create-invoice',
      translationKey: 'createInvoice',
      href: '/sales/invoices/new',
      icon: 'FileText',
      order: 1,
    },
    {
      id: 'create-quote',
      translationKey: 'createQuote',
      href: '/sales/quotes/new',
      icon: 'Receipt',
      order: 2,
    },
    {
      id: 'create-order',
      translationKey: 'createOrder',
      href: '/sales/orders/new',
      icon: 'ShoppingCart',
      order: 3,
    },
    {
      id: 'record-payment',
      translationKey: 'recordPayment',
      href: '/sales/invoices?action=payment',
      icon: 'CreditCard',
      order: 4,
    },
    {
      id: 'add-contact',
      translationKey: 'addContact',
      href: '/contacts/new',
      icon: 'UserPlus',
      order: 5,
    },
    {
      id: 'add-product',
      translationKey: 'addProduct',
      href: '/products/new',
      icon: 'Package',
      order: 6,
    },
    {
      id: 'import-data',
      translationKey: 'importData',
      href: '/settings/import',
      icon: 'Upload',
      order: 7,
    },
    {
      id: 'open-ai-chat',
      translationKey: 'openAIChat',
      href: '/chat',
      icon: 'MessageSquare',
      order: 8,
    },
  ],
  defaultVisibleStats: [
    'revenue-month',
    'outstanding',
    'overdue',
    'bank-balance',
  ],
  maxWorkflowSuggestions: 5,
  maxQuickActions: 4,
};
