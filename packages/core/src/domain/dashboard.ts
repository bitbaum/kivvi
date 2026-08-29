// Re-export from focused modules for backward compatibility
export { type DashboardAlert, getDashboardAlerts } from "./dashboard-alerts";
export { type WorkflowSuggestion, getWorkflowSuggestions } from "./dashboard-workflow";
export { type ActivityItem, getRecentActivity } from "./dashboard-activity";
export {
  type DashboardStat,
  type BusinessHealthMetrics,
  type ExecutiveSummaryHighlight,
  type ExecutiveSummary,
  getDashboardStats,
  getBusinessHealthMetrics,
  getExecutiveSummary,
} from "./dashboard-stats";
