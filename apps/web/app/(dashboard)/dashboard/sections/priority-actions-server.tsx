import { getDashboardAlerts, getWorkflowSuggestions } from '@kivvi/core/src/domain/dashboard';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PriorityActionsClient } from './priority-actions';

export async function PriorityActions() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const companyId = session.user.companyId;

  const [alerts, suggestions] = await Promise.all([
    getDashboardAlerts(db, companyId),
    getWorkflowSuggestions(db, companyId),
  ]);

  return <PriorityActionsClient alerts={alerts} suggestions={suggestions} />;
}
