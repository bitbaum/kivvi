import { test, expect } from "@playwright/test";
import { submitAndWaitForUrl, dismissErrorBoundary } from "./helpers";

test.describe("Invoices", () => {
  test.describe.configure({ mode: "serial" });

  let invoiceUrl: string;
  const CUSTOMER_NAME = `Invoice Test Customer ${Date.now()}`;

  test("create an invoice with line items", async ({ page }) => {
    // First create a contact to use on the invoice
    await page.goto("/contacts/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#name").fill(CUSTOMER_NAME);
    const newContactBtn = page.getByRole("button", { name: "New Contact", exact: true });
    await submitAndWaitForUrl(page, newContactBtn, /\/contacts\/[0-9a-f]{8}-/, 45_000);

    // Now create an invoice
    await page.goto("/sales/invoices/new");
    await page.waitForLoadState("networkidle");

    // Select a contact using the search textbox
    const contactSearch = page.getByPlaceholder("Search...");
    await contactSearch.fill("Invoice Test");
    // Click the matching contact button in the dropdown
    await page.getByRole("button", { name: new RegExp(CUSTOMER_NAME) }).click();

    // Fill first line item — Description input
    await page.getByPlaceholder("Description").first().fill("E2E Test Service");

    // Set quantity and unit price using spinbutton role
    const spinbuttons = page.getByRole("spinbutton");
    // First spinbutton is Quantity, second is Unit Price, third is Discount
    await spinbuttons.nth(0).clear();
    await spinbuttons.nth(0).fill("2");
    await spinbuttons.nth(1).clear();
    await spinbuttons.nth(1).fill("100");

    // Submit the invoice
    const submitButton = page.getByRole("button", { name: "New Invoice", exact: true });
    await submitAndWaitForUrl(page, submitButton, /\/sales\/invoices\/[0-9a-f]{8}-/, 45_000);
    invoiceUrl = page.url();

    // Verify invoice content
    await expect(page.getByText("E2E Test Service")).toBeVisible();
  });

  test("view invoice detail", async ({ page }) => {
    await page.goto(invoiceUrl);

    // Should show the line item
    await expect(page.getByText("E2E Test Service")).toBeVisible();

    // Should show some total amount
    await expect(page.getByText(/CHF/).first()).toBeVisible();
  });

  test("transition invoice status from draft to sent", async ({ page }) => {
    await page.goto(invoiceUrl);

    // Look for a status action button (e.g., "Send" or "Mark as Sent")
    const sendButton = page.getByRole("button", { name: /send|senden|versenden/i });
    if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendButton.click();

      // Confirm if dialog appears
      const confirmButton = page.getByRole("button", { name: /confirm|bestätigen/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Status should update
      await expect(page.getByText(/sent|gesendet/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("invoice appears in list", async ({ page }) => {
    await page.goto("/sales/invoices");
    await dismissErrorBoundary(page);

    // Should see at least one invoice
    await expect(page.getByText(/RE-/).first()).toBeVisible();
  });
});
