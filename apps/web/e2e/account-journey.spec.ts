import { test, expect, type Page } from "@playwright/test";
import { createPostgresClient, companies, memberships, users } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";

/**
 * An account can be made and used: sign-up and onboarding through the real
 * pages, sign-out, a wrong password refused, sign-in, the dashboard. Then the
 * company AI key: set through the settings form, it never comes back to the
 * browser — the field holds the mask or nothing (guards #185).
 *
 * Runs against the production build on a database built from the committed
 * migrations (.github/workflows/browser-smoke.yml). Synthetic people only.
 */

const run = Date.now().toString(36);
const NAME = "Journey Person";
const COMPANY = `Journey Werkstatt ${run}`;
const EMAIL = `journey-${run}@example.test`;
const PASSWORD = `synthetic journey password ${run}`;
const AI_KEY = `sk-journey-${run}-never-in-the-browser`;
const AI_KEY_MASK = "********";

const db = createPostgresClient(process.env.DATABASE_URL!);

test.afterAll(async () => {
  await db.$client.end();
});

// /login allows 10 requests a minute per address (lib/rate-limit.ts), so the
// journey stays on the sign-in page between attempts and asks the session
// endpoint, not a page, whether anyone is signed in.
async function submitSignIn(page: Page, email: string, password: string) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  const answered = page.waitForResponse(/\/api\/auth\/callback\/credentials/);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await answered;
}

async function sessionEmail(page: Page): Promise<string | null> {
  const session = await (await page.request.get("/api/auth/session")).json();
  return session?.user?.email ?? null;
}

test("an account is made, signed out, refused a wrong password, signed in, and keeps its AI key secret", async ({
  page,
}) => {
  await test.step("signed out, the legal links on the sign-up page open, not the login form", async () => {
    // /register allows 5 requests a minute (lib/rate-limit.ts): both links are
    // opened in their own tabs from this one load, and sign-up happens here.
    await page.goto("/register");
    const open = async (name: string) => {
      const opened = page.context().waitForEvent("page");
      await page.getByRole("link", { name }).click({ modifiers: ["ControlOrMeta"] });
      const tab = await opened;
      await tab.waitForLoadState();
      return tab;
    };

    const terms = await open("Terms of Service");
    await expect(terms).toHaveURL(/\/terms$/);
    await expect(terms.locator("#password"), "Terms is not the login form").toHaveCount(0);
    await terms.close();

    const privacy = await open("Privacy Policy");
    await expect(privacy).toHaveURL(/\/datenschutz$/);
    await expect(privacy.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    await expect(privacy.locator("#password"), "Privacy is not the login form").toHaveCount(0);
    await privacy.close();
  });

  await test.step("sign up as a new organisation", async () => {
    await page.locator("#name").fill(NAME);
    await page.locator("#companyName").fill(COMPANY);
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  await test.step("onboarding sets up the company and lands on the dashboard", async () => {
    await expect(page.getByRole("heading", { name: "Your Organisation" })).toBeVisible();
    await expect(page.locator("#name")).toHaveValue(COMPANY);
    await page.locator("#city").fill("Zürich");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByRole("heading", { name: "Business Configuration" })).toBeVisible();
    await page.getByRole("button", { name: "Complete setup" }).click();

    await page.getByRole("button", { name: /Start fresh/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const user = await db.query.users.findFirst({ where: eq(users.email, EMAIL) });
    expect(user?.companyId, "the new user has a company").toBeTruthy();
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user!.companyId!),
    });
    expect(company?.name).toBe(COMPANY);
    expect(company?.city).toBe("Zürich");
    expect((company?.settings as CompanySettings)?.onboardingCompletedAt).toBeTruthy();
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user!.id),
    });
    expect(membership?.role, "the person who signed up owns the company").toBe("owner");
  });

  await test.step("sign out from the user menu", async () => {
    expect(await sessionEmail(page)).toBe(EMAIL);
    await page.getByRole("button", { name: `User menu: ${NAME}` }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await sessionEmail(page), "the session is gone").toBeNull();
    const dashboard = await page.request.get("/dashboard", { maxRedirects: 0 });
    expect(dashboard.status(), "the dashboard asks for sign-in").toBe(307);
    expect(dashboard.headers()["location"]).toMatch(/\/login\?callbackUrl=%2Fdashboard/);
  });

  await test.step("wrong credentials are refused", async () => {
    for (const [email, password] of [
      [EMAIL, "not the password"],
      [`nobody-${run}@example.test`, PASSWORD],
    ]) {
      await submitSignIn(page, email, password);
      await expect(page.getByText("Invalid email or password.")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
      expect(await sessionEmail(page), `no session for ${email}`).toBeNull();
    }
  });

  await test.step("sign in and reach the dashboard", async () => {
    await submitSignIn(page, EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: `User menu: ${NAME}` })).toBeVisible();
    expect(await sessionEmail(page)).toBe(EMAIL);
  });

  await test.step("the company AI key never reaches the browser", async () => {
    await page.goto("/settings/company");
    // Until React swaps in the streamed page, its copy and the shell's can
    // both be in the document; read the field once there is one.
    const keyField = page.locator("#aiApiKey");
    await expect(keyField).toHaveCount(1);
    await expect(keyField).toHaveValue("");

    // Ollama takes no key check, so the save does not depend on a provider
    // answering; the key is still stored, sealed, like any other.
    await page.locator("#aiProvider").selectOption("ollama");
    await keyField.fill(AI_KEY);
    const save = page.locator("form", { has: keyField }).getByRole("button", {
      name: "Save Changes",
    });
    await save.click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    const stored = async () => {
      const user = await db.query.users.findFirst({ where: eq(users.email, EMAIL) });
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, user!.companyId!),
      });
      return (company?.settings as CompanySettings)?.aiApiKey;
    };
    const sealed = await stored();
    expect(sealed, "the key is stored sealed").toMatch(/^cak:v\d+:/);
    expect(sealed).not.toContain(AI_KEY);

    // Everything the settings page sends — HTML, RSC payload, scripts — is
    // read for the key, not only the field's value.
    const bodies: Promise<string>[] = [];
    page.on("response", (response) => {
      bodies.push(response.text().catch(() => ""));
    });
    await page.reload();
    await expect(keyField).toHaveCount(1);
    await expect(keyField).toBeVisible();
    const value = await keyField.inputValue();
    expect([AI_KEY_MASK, ""], `the key field holds "${value}"`).toContain(value);
    expect(await page.content()).not.toContain(AI_KEY);
    await page.waitForLoadState("networkidle");
    const leaked = (await Promise.all(bodies)).filter((body) => body.includes(AI_KEY));
    expect(leaked, "no response carries the key").toHaveLength(0);

    // Saving with the mask in place keeps the stored key as it is.
    await save.click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    expect(await stored(), "the mask means keep").toBe(sealed);
  });
});
