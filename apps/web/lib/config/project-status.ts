/** Project status values for form selectors (SSOT) */
export const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'cancelled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Translation key mapping for project statuses */
export const PROJECT_STATUS_LABEL_KEYS: Record<ProjectStatus, string> = {
  active: 'statusActive',
  completed: 'statusCompleted',
  on_hold: 'statusOnHold',
  cancelled: 'statusCancelled',
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
