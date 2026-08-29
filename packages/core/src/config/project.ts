/**
 * Project status constants — SSOT for domain validation and UI config.
 *
 * Client-safe: no DB or server dependencies.
 *
 * Imported by:
 * - packages/core/src/domain/projects.ts (Zod enum validation)
 * - apps/web/lib/config/project-status.ts (UI labels and styles)
 */

export const PROJECT_STATUS_VALUES = ["active", "completed", "on_hold", "cancelled"] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];
