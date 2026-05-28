/**
 * Centralized chart color configuration (SSOT).
 *
 * Chart libraries (Recharts) need hex/rgb strings; CSS vars resolved at
 * runtime don't always work for shape fills. We keep the values literal
 * here but tuned to the muted/achromatic-leaning palette used everywhere
 * else, so charts read as "from the same family" as the rest of the UI.
 *
 * Where a chart color overlaps with a semantic token (success, warning,
 * destructive, info) the hex roughly matches that token's resolved color
 * in light mode. If the design tokens change, this file needs a refresh.
 */

/**
 * Aging bucket colors (AR/AP aging reports).
 * Progression: muted green (current) → amber → orange → red → deep red.
 */
export const AGING_BUCKET_COLORS = {
  current: "#3f8a5b", // muted green (matches --success)
  days30: "#a3791a", // muted amber (matches --warning)
  days60: "#b85a26", // muted orange
  days90: "#b53a3a", // muted red (matches --destructive)
  over90: "#7f1d1d", // deep red
} as const;

/**
 * General chart colors for various chart types.
 * Tuned to the muted palette — saturated enough to read against the
 * background, calm enough not to clash with the rest of the UI.
 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  revenue: "#3b6bb5", // muted blue (matches --info)
  expense: "#b53a3a", // muted red
  profit: "#3f8a5b", // muted green (matches --success / brand family)
  loss: "#b53a3a", // muted red
  neutral: "#6b7280", // gray
  warning: "#a3791a", // muted amber
  info: "#3b6bb5", // muted blue
  success: "#3f8a5b", // muted green
} as const;

/**
 * Status-based colors (document status indicators in charts).
 * Match the resolved muted values of the --success, --warning,
 * --destructive, --info, --tag-purple tokens.
 */
export const STATUS_COLORS = {
  draft: "#6b7280", // gray
  sent: "#3b6bb5", // muted blue
  confirmed: "#7a4ea6", // muted purple
  delivered: "#3b8a99", // muted cyan
  paid: "#3f8a5b", // muted green
  partiallyPaid: "#a3791a", // muted amber
  overdue: "#b53a3a", // muted red
  cancelled: "#6b7280", // gray
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
