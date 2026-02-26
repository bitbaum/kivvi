import { test as setup, expect } from '@playwright/test';
import { seed, type TestData } from './helpers';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('seed database and authenticate', async ({ page }) => {
  setup.setTimeout(120_000);

  // 1. Seed test company + user
  const testData = await seed();

  // Write credentials to a temp file so specs can read them for cleanup
  fs.writeFileSync(
    path.join(__dirname, '.auth', 'test-data.json'),
    JSON.stringify(testData),
  );

  // 2. Login via UI
  await page.goto('/login');
  await page.locator('#email').fill(testData.email);
  await page.locator('#password').fill(testData.password);
  await page.locator('button[type="submit"]').click();

  // 3. Wait for navigation away from /login
  //    First load in dev mode is slow (Next.js compiles 5000+ modules)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 90_000 });

  // 4. Save auth state
  await page.context().storageState({ path: AUTH_FILE });
});
