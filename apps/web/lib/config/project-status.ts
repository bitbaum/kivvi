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
  active: "bg-success/10 text-success",
  completed: "bg-info/10 text-info",
  on_hold: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};
