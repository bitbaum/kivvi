import { PROJECT_STATUS_VALUES } from "@kivvi/core/src/config/project";

/** Re-export from domain SSOT — do not duplicate these values here */
export const PROJECT_STATUSES = PROJECT_STATUS_VALUES;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Translation key mapping for project statuses */
export const PROJECT_STATUS_LABEL_KEYS: Record<ProjectStatus, string> = {
  active: "statusActive",
  completed: "statusCompleted",
  on_hold: "statusOnHold",
  cancelled: "statusCancelled",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "bg-success/10 text-success",
  completed: "bg-info/10 text-info",
  on_hold: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};
