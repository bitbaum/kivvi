/**
 * Dashboard Configuration
 * SSOT for dashboard display settings.
 * Quick action definitions live in dashboard/sections/quick-actions.tsx
 * (JSX icons cannot be expressed in a plain data config without an icon map).
 */

export interface DashboardConfig {
  defaultVisibleStats: string[];
  maxQuickActions: number;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  defaultVisibleStats: [
    "revenue-month",
    "outstanding",
    "overdue",
    "bank-balance",
  ],
  maxQuickActions: 4,
};
