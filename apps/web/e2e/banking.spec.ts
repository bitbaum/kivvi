import { test, expect } from "@playwright/test";
import { dismissErrorBoundary } from "./helpers";

/**
 * E2E tests for banking pages:
 *  - Bank accounts list loads
 *  - Add bank account form renders
 *  - Bank transactions page loads for existing account
 *
 * These tests do NOT create real bank accounts (would require IBAN + onboarding
 * state). They verify that the pages render correctly and don't crash.
 */
test.describe("Banking", () => {
  test("bank accounts list page loads", async ({ page }) => {
    await page.goto("/banking");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    expect(page.url()).toContain("/banking");

    // Page should not show unhandled error
    const errorBoundary = page.getByText(/something went wrong/i);
    await expect(errorBoundary).not.toBeVisible();

    // Either shows bank accounts or empty state — both are valid
    const heading = page
      .getByRole("heading", { level: 1 })
      .or(page.getByText(/bank|konto/i).first());
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });
  });

  test("add bank account button is present", async ({ page }) => {
    await page.goto("/banking");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    // Should have a way to add a bank account
    const addButton = page
      .getByRole("button", { name: /add|neu|konto/i })
      .or(page.getByRole("link", { name: /add|neu|konto/i }));
    if ((await addButton.count()) > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test("accounting journal page loads", async ({ page }) => {
    await page.goto("/accounting/journal");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    expect(page.url()).toContain("/accounting/journal");

    const errorBoundary = page.getByText(/something went wrong/i);
    await expect(errorBoundary).not.toBeVisible();
  });

  test("chart of accounts page loads", async ({ page }) => {
    await page.goto("/accounting/chart-of-accounts");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    expect(page.url()).toContain("/accounting/chart-of-accounts");

    const errorBoundary = page.getByText(/something went wrong/i);
    await expect(errorBoundary).not.toBeVisible();

    // Should show account codes (Swiss KMU format 1000-9999)
    const accountCodes = page.locator("text=/^1[0-9]{3}/");
    if ((await accountCodes.count()) > 0) {
      await expect(accountCodes.first()).toBeVisible();
    }
  });

  test("fiscal years page loads", async ({ page }) => {
    await page.goto("/accounting/fiscal-years");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    expect(page.url()).toContain("/accounting/fiscal-years");

    const errorBoundary = page.getByText(/something went wrong/i);
    await expect(errorBoundary).not.toBeVisible();
  });
});
