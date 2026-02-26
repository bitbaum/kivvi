import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('dashboard loads with sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Main navigation sidebar should be visible
    const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible();

    // Kivvi logo link should be present
    await expect(page.getByRole('link', { name: 'Kivvi Home' })).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    // Each page navigation triggers dev-mode compilation — need extra time
    test.setTimeout(120_000);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to contacts via sidebar
    await page.getByRole('link', { name: 'People' }).click();
    await expect(page).toHaveURL(/\/contacts/, { timeout: 45_000 });

    // Navigate to products via sidebar
    await page.getByRole('link', { name: 'Catalog' }).click();
    await expect(page).toHaveURL(/\/products/, { timeout: 45_000 });
  });

  test('command palette opens with keyboard shortcut', async ({ page }) => {
    await page.goto('/dashboard');

    // Open command palette with Ctrl+K
    await page.keyboard.press('Control+k');

    // The command palette dialog (not the AI assistant dialog) should appear
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test('direct URL navigation works for protected routes', async ({ page }) => {
    // Navigate directly to contacts
    await page.goto('/contacts');
    await expect(page).toHaveURL(/\/contacts/);

    // Navigate directly to invoices (use waitUntil: 'commit' to handle slow compilation)
    await page.goto('/sales/invoices', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/sales\/invoices/);
  });
});
