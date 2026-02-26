import { test, expect } from '@playwright/test';
import { submitAndWaitForUrl, dismissErrorBoundary } from './helpers';

const CONTACT_NAME = `E2E Contact ${Date.now()}`;

test.describe('Contacts CRUD', () => {
  test.describe.configure({ mode: 'serial' });

  let contactUrl: string;

  test('create a new contact', async ({ page }) => {
    await page.goto('/contacts/new');

    // Wait for client-side hydration (form handler must be attached before submit)
    await page.waitForLoadState('networkidle');

    // Fill required fields
    await page.locator('#name').fill(CONTACT_NAME);

    // Type defaults to "customer" — verify it's selected
    await expect(page.locator('#type')).toHaveValue('customer');

    // Fill optional fields
    await page.locator('#email').fill('e2e-contact@test.ch');
    await page.locator('#phone').fill('+41 44 000 00 00');
    await page.locator('#address').fill('Teststrasse 1');
    await page.locator('#postalCode').fill('8000');
    await page.locator('#city').fill('Zurich');

    // Submit — retries once if hydration wasn't ready
    const submitButton = page.getByRole('button', { name: 'New Contact', exact: true });
    await submitAndWaitForUrl(page, submitButton, /\/contacts\/[0-9a-f]{8}-/);
    contactUrl = page.url();

    // Verify the contact name is shown on the detail page (heading)
    await expect(page.getByRole('heading', { name: CONTACT_NAME })).toBeVisible();
  });

  test('contact appears in list', async ({ page }) => {
    await page.goto('/contacts');
    await dismissErrorBoundary(page);

    // The new contact should appear in the list
    await expect(page.getByText(CONTACT_NAME).first()).toBeVisible();
  });

  test('view contact detail', async ({ page }) => {
    await page.goto(contactUrl);

    await expect(page.getByRole('heading', { name: CONTACT_NAME })).toBeVisible();
    await expect(page.getByText('e2e-contact@test.ch')).toBeVisible();
    await expect(page.getByText('Zurich')).toBeVisible();
  });

  test('edit contact', async ({ page }) => {
    await page.goto(contactUrl);

    // Click edit button/link
    await page.getByRole('link', { name: /edit|bearbeiten/i }).click();
    await expect(page).toHaveURL(/\/edit/);

    // Change the city
    const cityInput = page.locator('#city');
    await cityInput.clear();
    await cityInput.fill('Bern');

    // Submit
    await page.getByRole('button', { name: /save|speichern|update/i }).click();

    // Should redirect back to detail and show updated city
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f]{8}-/);
    await expect(page.getByText('Bern')).toBeVisible();
  });

  test('delete contact', async ({ page }) => {
    await page.goto(contactUrl);
    await page.waitForLoadState('networkidle');

    // Click delete button — retry if hydration not complete (confirm dialog doesn't appear)
    const deleteButton = page.getByRole('button', { name: /delete|löschen/i });
    const yesButton = page.getByRole('button', { name: /^yes$|^ja$/i });

    await deleteButton.click();
    if (!await yesButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Hydration wasn't complete on first click — retry
      await deleteButton.click();
    }
    await expect(yesButton).toBeVisible({ timeout: 3000 });
    await yesButton.click();

    // Wait for delete action to complete and redirect to list page
    await expect(page).toHaveURL(/\/contacts$/, { timeout: 15_000 });

    // Force fresh server render to bypass Next.js Router Cache
    await page.goto(`/contacts?_t=${Date.now()}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(CONTACT_NAME)).not.toBeVisible({ timeout: 10_000 });
  });
});
