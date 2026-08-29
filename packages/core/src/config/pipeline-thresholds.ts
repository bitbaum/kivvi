/**
 * Days-in-status thresholds for pipeline items.
 * warn  → yellow indicator; alert → red indicator + dashboard alert fires.
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/dashboard-alerts.ts (alert trigger dates)
 * - apps/web/app/(dashboard)/intake/repair-queue/page.tsx (ageClass colours)
 * - apps/web/components/inventory/selectable-item-list.tsx (age badge colours)
 */

export const PIPELINE_THRESHOLDS = {
  intake: { warn: 3, alert: 7 },
  testing: { warn: 7, alert: 14 },
  repair: { warn: 7, alert: 14 },
  ready_for_sale: { warn: 30, alert: 60 },
} as const;

export type PipelineStatus = keyof typeof PIPELINE_THRESHOLDS;

export const PIPELINE_STATUSES = Object.keys(PIPELINE_THRESHOLDS) as PipelineStatus[];
