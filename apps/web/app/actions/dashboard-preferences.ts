'use server';

import {
  getDashboardPreferences,
  updateDashboardPreferences,
  resetDashboardPreferences,
  type DashboardPreferences,
} from '@kivvi/core/src/domain/dashboard-preferences';
import { createAction } from './action-factory';

export const getDashboardPreferencesAction = createAction<void, DashboardPreferences>({
  handler: async (_input, { companyId, db }) => {
    return getDashboardPreferences(db, companyId);
  },
  errorMessage: 'Failed to load dashboard preferences',
});

export const updateDashboardPreferencesAction = createAction<Partial<DashboardPreferences>, void>({
  handler: async (preferences, { companyId, db }) => {
    await updateDashboardPreferences(db, companyId, preferences);
  },
  revalidate: ['/dashboard'],
  errorMessage: 'Failed to save dashboard preferences',
});

export const resetDashboardPreferencesAction = createAction<void, void>({
  handler: async (_input, { companyId, db }) => {
    await resetDashboardPreferences(db, companyId);
  },
  revalidate: ['/dashboard'],
  errorMessage: 'Failed to reset dashboard preferences',
});
