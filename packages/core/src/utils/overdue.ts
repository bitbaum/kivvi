/**
 * Overdue detection — pure logic, no DB dependencies.
 * Safe to import in client components.
 *
 * SSOT for overdue determination. Used by:
 * - packages/core/src/domain/documents.ts (getOverdueInfo re-exports this)
 * - Client components that need overdue status
 * - Nav badge counts (via OVERDUE_ELIGIBLE_STATUSES in document-constants)
 */

import { OVERDUE_CANDIDATE_STATUSES } from "../config/document-constants";

const OVERDUE_STATUS_SET = new Set<string>(OVERDUE_CANDIDATE_STATUSES);

export function getOverdueInfo(doc: { status: string; dueDate: Date | string | null }): {
  isOverdue: boolean;
  daysOverdue: number;
} {
  const isOverdue =
    OVERDUE_STATUS_SET.has(doc.status) && !!doc.dueDate && new Date(doc.dueDate) < new Date();

  const daysOverdue =
    isOverdue && doc.dueDate
      ? Math.floor((Date.now() - new Date(doc.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return { isOverdue, daysOverdue };
}
