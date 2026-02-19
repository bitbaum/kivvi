import type { CompanySettings } from '@kivvi/database';

const TRIAL_DURATION_DAYS = 30;

/**
 * Check if the company's plan is active (premium or valid trial).
 */
export function isPlanActive(settings: CompanySettings): boolean {
  if (settings.plan === 'premium' && settings.subscriptionStatus === 'active') {
    return true;
  }
  return isTrialing(settings);
}

/**
 * Check if the company is currently in a valid trial.
 */
export function isTrialing(settings: CompanySettings): boolean {
  if (!settings.trialEndsAt) return false;
  return new Date(settings.trialEndsAt) > new Date();
}

/**
 * Get remaining trial days (0 if trial expired or not set).
 */
export function getTrialDaysRemaining(settings: CompanySettings): number {
  if (!settings.trialEndsAt) return 0;
  const remaining = new Date(settings.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/**
 * Determine if the upgrade banner should be shown.
 * Show when: free plan, trial expiring soon (≤7 days), or trial expired.
 */
export function shouldShowUpgradeBanner(settings: CompanySettings): boolean {
  if (settings.plan === 'premium' && settings.subscriptionStatus === 'active') {
    return false;
  }
  if (settings.subscriptionStatus === 'past_due') {
    return true;
  }
  const daysRemaining = getTrialDaysRemaining(settings);
  if (daysRemaining <= 7) return true;
  if (settings.plan === 'free' && !settings.trialEndsAt) return true;
  return false;
}

/**
 * Get the default trial end date (30 days from now).
 */
export function getDefaultTrialEnd(): string {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_DURATION_DAYS);
  return date.toISOString();
}
