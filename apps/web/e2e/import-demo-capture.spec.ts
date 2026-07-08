import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { createNeonClient, warehouses } from "@kivvi/database";
import { seed } from "./helpers";

const OUT = path.resolve(
  __dirname,
  "../../../docs/fixtures/screenshots/import-demo",
);
const CSV = path.resolve(
  __dirname,
  "../../../docs/fixtures/inventory-import-sample-10.csv",
);

test.describe("Inventory import demo capture", () => {
  test("capture smart import UX for dry-run", async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(OUT, { recursive: true });

    const testData = await seed();
    const db = createNeonClient(process.env.DATABASE_URL!);
    await db.insert(warehouses).values([
      { companyId: testData.companyId, name: "Shop", isDefault: true },
      { companyId: testData.companyId, name: "Lager A" },
    ]);

    await page.goto("/login");
    await page.locator("#email").fill(testData.email);
    await page.locator("#password").fill(testData.password);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 120_000 });

    await page.goto("/intake/items");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT, "01-intake-items-import-button.png"),
      fullPage: true,
    });

    await page.goto("/intake/items/import");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(OUT, "02-upload-zone.png"),
      fullPage: true,
    });

    await page.locator('input[type="file"]').setInputFiles(CSV);
    await expect(page.locator("table")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: path.join(OUT, "03-review-worklist.png"),
      fullPage: true,
    });

    await page
      .getByRole("button", { name: /Confirm all present|Alle als vorhanden/i })
      .click();
    await page.screenshot({
      path: path.join(OUT, "04-presence-confirmed.png"),
      fullPage: true,
    });

    const importBtn = page.getByRole("button", {
      name: /Import \d+ items|\d+ Artikel importieren/i,
    });
    await expect(importBtn).toBeEnabled();
    const label = await importBtn.textContent();
    console.log("Ready to import:", label);
    await page.screenshot({
      path: path.join(OUT, "05-ready-to-import.png"),
      fullPage: true,
    });
  });
});
