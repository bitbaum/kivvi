import {
  getDashboardAlerts,
  getWorkflowSuggestions,
} from "@kivvi/core/src/domain/dashboard";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { PriorityActionsClient } from "./priority-actions";

export async function PriorityActions({ sinceDate }: { sinceDate?: Date }) {
  const session = await getSessionOrRedirect();
  const companyId = session.user.companyId;

  const [alerts, suggestions] = await Promise.all([
    getDashboardAlerts(db, companyId, sinceDate),
    getWorkflowSuggestions(db, companyId),
  ]);

  return <PriorityActionsClient alerts={alerts} suggestions={suggestions} />;
}
