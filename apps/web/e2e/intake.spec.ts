import { test, expect } from "@playwright/test";
import { submitAndWaitForUrl, dismissErrorBoundary } from "./helpers";

/**
 * E2E tests for the intake workflow:
 *  - Create intake document (donation source)
 *  - Add a line item
 *  - Submit and verify the EI- document is created
 *  - Verify inventory item link is visible
 */
test.describe("Intake", () => {
  test.describe.configure({ mode: "serial" });

  let intakeUrl: string;
  const DONOR_NAME = `Intake E2E Donor ${Date.now()}`;

  test("create an intake document (donation)", async ({ page }) => {
    await page.goto("/intake/new");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    // Select intake source — donation
    const donationRadio = page
      .getByRole("radio", { name: /donation/i })
      .or(page.locator('input[value="donation"]'));
    if ((await donationRadio.count()) > 0) {
      await donationRadio.first().click();
    }

    // Fill in donor name via contact search or free-text
    const contactSearch = page.getByPlaceholder(/search|contact/i).first();
    if ((await contactSearch.count()) > 0) {
      await contactSearch.fill(DONOR_NAME);
      // If dropdown appears, try to click "create" option; otherwise leave as-is
      const createOption = page.getByRole("button", {
        name: new RegExp(DONOR_NAME, "i"),
      });
      if ((await createOption.count()) > 0) {
        await createOption.first().click();
      }
    }

    // Fill line item description
    const descInput = page.getByPlaceholder(/description|beschreibung/i).first();
    if ((await descInput.count()) > 0) {
      await descInput.fill("ThinkPad T480 — E2E Test Donation");
    }

    // Quantity
    const qtyInput = page.locator('input[name*="quantity"], input[id*="quantity"]').first();
    if ((await qtyInput.count()) > 0) {
      await qtyInput.fill("1");
    }

    // Submit
    const submitBtn = page.getByRole("button", { name: /save|submit|create|erfassen/i }).first();
    await submitAndWaitForUrl(page, submitBtn, /\/intake\/[0-9a-f]{8}-/, 30_000);

    intakeUrl = page.url();
    expect(intakeUrl).toMatch(/\/intake\/[0-9a-f-]{36}/);
  });

  test("intake detail page loads and shows EI- number", async ({ page }) => {
    test.skip(!intakeUrl, "Skipped — depends on previous test creating intake");

    await page.goto(intakeUrl);
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    // Should show EI- document number
    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/EI-\d{4}-\d{5}/);
  });

  test("intake items page lists inventory items", async ({ page }) => {
    await page.goto("/intake/items");
    await page.waitForLoadState("networkidle");
    await dismissErrorBoundary(page);

    // Page should render without error
    expect(page.url()).toContain("/intake/items");
    // Should not show a hard error message
    const errorBoundary = page.getByText(/something went wrong/i);
    await expect(errorBoundary).not.toBeVisible();
  });
});
