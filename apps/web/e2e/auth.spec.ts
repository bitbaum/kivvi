import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Read test data written by auth.setup.ts
function getTestData() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, ".auth", "test-data.json"), "utf-8"));
}

test.describe("Authentication", () => {
  // These tests do NOT use the saved storageState — they test login from scratch.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("WrongPassword1!");
    await page.locator('button[type="submit"]').click();

    // Error container (not the * markers on labels) should appear
    await expect(page.locator('[class*="bg-destructive"]')).toBeVisible({ timeout: 10000 });
  });

  test("logs in with valid credentials and redirects to dashboard", async ({ page }) => {
    const { email, password } = getTestData();

    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page).not.toHaveURL(/\/login/);
  });

  test("preserves callbackUrl after login", async ({ page }) => {
    const { email, password } = getTestData();

    // Visit a protected page — should redirect to /login with callbackUrl
    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/login\?callbackUrl/);

    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator('button[type="submit"]').click();

    // Should redirect back to /contacts
    await expect(page).toHaveURL(/\/contacts/);
  });

  test("redirects authenticated user from /login to /dashboard", async ({ page }) => {
    const { email, password } = getTestData();

    // Log in first
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/\/login/);

    // Now visit /login again — should redirect away
    await page.goto("/login");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
