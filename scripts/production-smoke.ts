import { chromium, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.KIVVI_SMOKE_BASE_URL ?? "https://kivvi.orangecat.ch";
const email = process.env.KIVVI_SMOKE_EMAIL;
const password = process.env.KIVVI_SMOKE_PASSWORD;
const outputDir = process.env.KIVVI_SMOKE_OUTPUT_DIR ?? "/tmp/kivvi-production-smoke";

const pages = [
  { path: "/dashboard", name: "dashboard", text: /Kivvi|Dashboard|Übersicht/ },
  { path: "/intake", name: "intake", text: /Intake|Wareneingang|Réception/ },
  { path: "/inventory", name: "inventory", text: /Inventory|Inventar|Stock/ },
  { path: "/contacts", name: "contacts", text: /Contacts|Kontakte|Contacts/ },
  {
    path: "/sales/invoices",
    name: "invoices",
    text: /Invoices|Rechnungen|Factures/,
  },
  {
    path: "/repairs",
    name: "repairs",
    text: /Repairs|Reparaturen|Réparations/,
  },
  {
    path: "/money",
    name: "money",
    text: /Money|Banking|Buchhaltung|Comptabilité/,
  },
  { path: "/reports", name: "reports", text: /Reports|Berichte|Rapports/ },
  { path: "/settings/webhooks", name: "webhooks", text: /Webhooks/ },
  { path: "/chat", name: "chat", text: /AI|KI|Kivvi/ },
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function requireCredentials() {
  if (!email || !password) {
    throw new Error(
      "Set KIVVI_SMOKE_EMAIL and KIVVI_SMOKE_PASSWORD before running production smoke.",
    );
  }
}

async function assertNoObviousLayoutBreak(page: Page, label: string) {
  const horizontalOverflow = await page.evaluate(() => {
    const body = document.body;
    const doc = document.documentElement;
    return Math.max(body.scrollWidth, doc.scrollWidth) - doc.clientWidth;
  });

  if (horizontalOverflow > 8) {
    throw new Error(`${label}: horizontal overflow ${horizontalOverflow}px`);
  }

  const visibleError = await page
    .getByText(/Something went wrong|Application error|Internal Server Error/i)
    .first()
    .isVisible({ timeout: 500 })
    .catch(() => false);

  if (visibleError) {
    throw new Error(`${label}: visible application error`);
  }
}

async function assertVisiblePageText(page: Page, pattern: RegExp, label: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const text = await page.locator("body").innerText({ timeout: 5_000 });
    if (pattern.test(text)) {
      return;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`${label}: expected visible text ${pattern}`);
}

async function login(page: Page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email!);
  await page.locator("#password").fill(password!);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 60_000,
    }),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function smoke() {
  requireCredentials();
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  try {
    await login(page);

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      for (const check of pages) {
        const label = `${viewport.name}:${check.name}`;
        await page.goto(`${baseUrl}${check.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
        await assertVisiblePageText(page, check.text, label);
        await assertNoObviousLayoutBreak(page, label);
        await page.screenshot({
          path: path.join(outputDir, `${viewport.name}-${check.name}.png`),
          fullPage: true,
        });
        console.log(`ok ${label} ${check.path}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

smoke().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
