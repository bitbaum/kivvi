'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  getDashboardPreferences,
  updateDashboardPreferences,
  resetDashboardPreferences,
  type DashboardPreferences,
} from '@kivvi/core/src/domain/dashboard-preferences';
import { getSession, type ActionResult } from './utils';

/**
 * Get current dashboard preferences
 */
export async function getDashboardPreferencesAction(): Promise<
  ActionResult<DashboardPreferences>
> {
  try {
    const { companyId } = await getSession();
    const preferences = await getDashboardPreferences(db, companyId);
    return { success: true, data: preferences };
  } catch (error) {
    console.error('Error getting dashboard preferences:', error);
    return {
      success: false,
      error: 'Failed to load dashboard preferences',
    };
  }
}

/**
 * Update dashboard preferences
 */
export async function updateDashboardPreferencesAction(
  preferences: Partial<DashboardPreferences>
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    await updateDashboardPreferences(db, companyId, preferences);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error updating dashboard preferences:', error);
    return {
      success: false,
      error: 'Failed to save dashboard preferences',
    };
  }
}

/**
 * Reset dashboard preferences to defaults
 */
export async function resetDashboardPreferencesAction(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    await resetDashboardPreferences(db, companyId);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error resetting dashboard preferences:', error);
    return {
      success: false,
      error: 'Failed to reset dashboard preferences',
    };
  }
}
