/**
 * Centralized chart color configuration (SSOT).
 * All chart colors for the application defined in one place.
 */

/**
 * Aging bucket colors (used in AR/AP aging reports).
 * Color progression: Green (current) → Yellow → Orange → Red → Dark Red (very overdue)
 */
export const AGING_BUCKET_COLORS = {
  current: '#22c55e',   // Green - current/not overdue
  days30: '#eab308',    // Yellow - 1-30 days overdue
  days60: '#f97316',    // Orange - 31-60 days overdue
  days90: '#ef4444',    // Red - 61-90 days overdue
  over90: '#991b1b',    // Dark red - over 90 days overdue
} as const;

/**
 * General chart colors for various chart types.
 */
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  revenue: '#3b82f6',      // Blue - revenue/income
  expense: '#ef4444',      // Red - expenses/costs
  profit: '#22c55e',       // Green - profit/gains
  loss: '#ef4444',         // Red - losses
  neutral: '#6b7280',      // Gray - neutral/informational
  warning: '#f59e0b',      // Amber - warnings/caution
  info: '#3b82f6',         // Blue - informational
  success: '#10b981',      // Emerald - success states
} as const;

/**
 * Status-based colors (for document status indicators).
 */
export const STATUS_COLORS = {
  draft: '#6b7280',        // Gray - draft
  sent: '#3b82f6',         // Blue - sent
  confirmed: '#8b5cf6',    // Purple - confirmed
  delivered: '#06b6d4',    // Cyan - delivered
  paid: '#22c55e',         // Green - paid
  partiallyPaid: '#eab308', // Yellow - partially paid
  overdue: '#ef4444',      // Red - overdue
  cancelled: '#6b7280',    // Gray - cancelled
} as const;

/**
 * Helper to get aging bucket color array (for chart libraries that expect arrays).
 */
export const AGING_BUCKET_COLOR_ARRAY = [
  AGING_BUCKET_COLORS.current,
  AGING_BUCKET_COLORS.days30,
  AGING_BUCKET_COLORS.days60,
  AGING_BUCKET_COLORS.days90,
  AGING_BUCKET_COLORS.over90,
] as const;
