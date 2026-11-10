import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { createPostgresClient, companies, memberships, users } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";

/**
 * Every way into a Kivvi account, on AccountKit's own screens, in a real
 * Chromium against the production build and a database built from the
 * committed migrations plus the cutover import
 * (.github/workflows/browser-smoke.yml):
 *
 *   - /login, /register and /forgot-password at 320px and 390px: no sideways
 *     scroll, and the methods the env asks for, as visible text;
 *   - sign up through AccountKit's form, create the organisation on /join,
 *     onboarding, the dashboard;
 *   - sign out, a wrong password refused, the right one accepted;
 *   - the company AI key never sent back to the browser (#185);
 *   - passkeys, two-factor and account deletion on the profile settings;
 *   - an account imported from Auth.js (bcrypt, seeded before the import)
 *     signs in with its old password, into its company;
 *   - recovery through the mailed link: the old password refused, the new one
 *     accepted; and an email sign-in link signing in.
 *
 * Mail is AccountKit's real mail, caught by scripts/ci/mail-sink.cjs
 * (MAIL_SINK). Synthetic people only.
 */

const run = Date.now().toString(36);
const COMPANY = `Journey Werkstatt ${run}`;
const EMAIL = `journey-${run}@example.test`;
const PASSWORD = `synthetic journey password ${run}`;
const NEW_LEGACY_PASSWORD = `synthetic reset password ${run}`;
const AI_KEY = `sk-journey-${run}-never-in-the-browser`;
const AI_KEY_MASK = "********";
const SINK = process.env.MAIL_SINK;
const LEGACY_EMAIL = process.env.LEGACY_EMAIL;
const LEGACY_PASSWORD = process.env.LEGACY_PASSWORD;
const EXPECT = {
  mail: Boolean(SINK),
  orangecat: Boolean(process.env.ORANGECAT_OAUTH_CLIENT_ID),
  // AccountKit 0.24+ shows the shared sign-in only once its service publishes
  // a provider (<SIGNIN_ISSUER>/api/providers). CI points at the real issuer
  // (Morulia), so whether the button belongs on the page is read from it
  // below, not assumed: Morulia began publishing Google and GitHub on
  // 2026-11-10 and the hard-coded `false` turned main red.
  signin: false,
};

test.beforeAll(async () => {
  const issuer = process.env.SIGNIN_ISSUER;
  if (!issuer || !process.env.SIGNIN_CLIENT_ID) return;
  try {
    const response = await fetch(new URL("/api/providers", issuer), {
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json()) as { providers?: unknown[] };
    EXPECT.signin = response.ok && (body.providers?.length ?? 0) > 0;
  } catch {
    EXPECT.signin = false;
  }
});

const db = createPostgresClient(process.env.DATABASE_URL!);

test.afterAll(async () => {
  await db.$client.end();
});

// /login allows 10 page loads a minute per address, /register and
// /forgot-password 5 (lib/rate-limit.ts). The journey loads them more often
// than that, so each load comes from its own (documentation-range) address.
let hop = 0;
async function visit(page: Page, path: string) {
  hop += 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${hop % 250}` });
  await page.goto(path);
}

const button = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: true });

async function sessionEmail(page: Page): Promise<string | null> {
  const session = await (await page.request.get("/api/auth/session")).json();
  return session?.user?.email ?? null;
}

async function signInWithPassword(page: Page, email: string, password: string) {
  await visit(page, "/login");
  await page.locator('input[autocomplete="username webauthn"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await button(page, "Sign in").click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /^User menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await sessionEmail(page), "the session is gone").toBeNull();
}

/** The newest link to `route` in a message to `to`, from the mail sink. */
async function mailedLink(to: string, route: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const lines = (await readFile(SINK!, "utf8").catch(() => "")).split("\n").filter(Boolean);
    for (const line of lines.reverse()) {
      const mail = JSON.parse(line);
      if (![mail.to].flat().includes(to)) continue;
      const html = String(mail.html ?? mail.text ?? "").replaceAll("&amp;", "&");
      const link = html.match(new RegExp(`https?://[^"'\\s<>]*${route}[^"'\\s<>]*`));
      if (link) return link[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no ${route} link was mailed`);
}

test("every way in works on AccountKit's screens, and the AI key stays secret", async ({
  page,
  browser,
}) => {
  await test.step("signed out, the privacy policy opens from the site footer, not the login form", async () => {
    await visit(page, "/");
    await page.locator("footer").getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page).toHaveURL(/\/datenschutz$/);
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  });

  await test.step("the auth pages fit a phone and show no Google-only button", async () => {
    for (const width of [320, 390]) {
      const phone = await browser.newPage({ viewport: { width, height: 844 }, locale: "en-US" });
      for (const route of ["/login", "/register", "/forgot-password"]) {
        await visit(phone, route);
        await phone.waitForLoadState("networkidle");
        const overflow = await phone.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${route} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
        // The app's own Google-only button is gone; the shared sign-in may
        // legitimately read "Continue with Google" when that is all it offers.
        if (!EXPECT.signin)
          await expect(
            phone.getByRole("button", { name: /^(sign in|continue) with google$/i }),
          ).toHaveCount(0);
      }
      await phone.close();
    }
  });

  const offered = async (route: string, labels: Array<[string | RegExp, boolean]>) => {
    await visit(page, route);
    for (const [name, wanted] of labels) {
      const control = button(page, name);
      if (wanted) await expect(control, `${route} offers "${name}"`).toBeVisible();
      else await expect(control, `${route} hides "${name}"`).toHaveCount(0);
    }
  };

  await test.step("the sign-in page offers every method the env asks for", async () => {
    await offered("/login", [
      ["Sign in", true],
      ["Sign in with a passkey", true],
      ["Email me a sign-in link instead", EXPECT.mail],
      ["Forgot your password?", EXPECT.mail],
      ["Continue with OrangeCat", EXPECT.orangecat],
      [/^Continue with (Google|Apple|GitHub|X|Facebook|Microsoft)/, EXPECT.signin],
    ]);
  });

  await test.step("the sign-up page offers them too, and points at no terms page", async () => {
    await offered("/register", [
      ["Create an account", true],
      ["Email me a link instead", EXPECT.mail],
      ["Continue with OrangeCat", EXPECT.orangecat],
      [/^Continue with (Google|Apple|GitHub|X|Facebook|Microsoft)/, EXPECT.signin],
    ]);
    await expect(page.locator('a[href="/terms"]')).toHaveCount(0);
  });

  await test.step("sign up, create the organisation on /join, finish onboarding", async () => {
    await page.locator('input[autocomplete="email"]').fill(EMAIL);
    await page.locator('input[autocomplete="new-password"]').fill(PASSWORD);
    await button(page, "Create an account").click();
    await expect(page).toHaveURL(/\/join/);
    expect(await sessionEmail(page)).toBe(EMAIL);

    await page.locator('input[autocomplete="organization"]').fill(COMPANY);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await expect(page.getByRole("heading", { name: "Your Organisation" })).toBeVisible();
    await expect(page.locator("#name")).toHaveValue(COMPANY);
    await page.locator("#city").fill("Zürich");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Business Configuration" })).toBeVisible();
    await page.getByRole("button", { name: "Complete setup" }).click();
    await page.getByRole("button", { name: /Start fresh/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const user = await db.query.users.findFirst({ where: eq(users.email, EMAIL) });
    expect(user?.passwordHash, "AccountKit holds the password, not users").toBeNull();
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user!.companyId!),
    });
    expect(company?.name).toBe(COMPANY);
    expect((company?.settings as CompanySettings)?.onboardingCompletedAt).toBeTruthy();
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user!.id),
    });
    expect(membership?.role, "the person who signed up owns the company").toBe("owner");
  });

  await test.step("sign out; the dashboard asks for sign-in", async () => {
    await signOut(page);
    const dashboard = await page.request.get("/dashboard", { maxRedirects: 0 });
    expect(dashboard.status()).toBe(307);
    expect(dashboard.headers()["location"]).toMatch(/\/login\?callbackUrl=%2Fdashboard/);
  });

  await test.step("a wrong password is refused, the right one signs in", async () => {
    await signInWithPassword(page, EMAIL, "not the password");
    await expect(page.getByText("That email and password do not match")).toBeVisible();
    expect(await sessionEmail(page)).toBeNull();
    await signInWithPassword(page, EMAIL, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await sessionEmail(page)).toBe(EMAIL);
  });

  await test.step("the company AI key never reaches the browser", async () => {
    await visit(page, "/settings/company");
    const keyField = page.locator("#aiApiKey");
    await expect(keyField).toHaveCount(1);
    await expect(keyField).toHaveValue("");
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
    await save.click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    expect(await stored(), "the mask means keep").toBe(sealed);
  });

  await test.step("the profile settings offer passkeys, two-factor and deletion", async () => {
    await visit(page, "/settings/profile");
    for (const title of ["Passkeys", "Two-factor sign-in"]) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /delete/i }).first()).toBeVisible();
    await signOut(page);
  });

  await test.step("an account imported from Auth.js signs in with its old password", async () => {
    expect(
      LEGACY_EMAIL && LEGACY_PASSWORD,
      "LEGACY_EMAIL and LEGACY_PASSWORD are set",
    ).toBeTruthy();
    await signInWithPassword(page, LEGACY_EMAIL!, LEGACY_PASSWORD!);
    await expect(page).toHaveURL(/\/dashboard/);
    const session = await (await page.request.get("/api/auth/session")).json();
    expect(session?.user).toMatchObject({ email: LEGACY_EMAIL, role: "owner" });
    expect(session?.user?.companyId).toBeTruthy();
    await signOut(page);
  });

  if (!EXPECT.mail) return;

  await test.step("recovery through the mailed link sets a new password", async () => {
    await visit(page, "/forgot-password");
    await page.locator('input[autocomplete="email"]').fill(LEGACY_EMAIL!);
    await button(page, "Email me a reset link").click();
    await expect(page.getByText("If an account can be recovered")).toBeVisible();
    await page.goto(await mailedLink(LEGACY_EMAIL!, "/api/auth/reset-password/"));
    await expect(page).toHaveURL(/\/login/);
    await page.locator('input[autocomplete="new-password"]').fill(NEW_LEGACY_PASSWORD);
    expect(page.url(), "the reset token leaves the address bar").not.toContain("token=");
    await button(page, "Reset password").click();
    await expect(page.getByText("Your password has been changed")).toBeVisible();

    await signInWithPassword(page, LEGACY_EMAIL!, LEGACY_PASSWORD!);
    await expect(page.getByText("That email and password do not match")).toBeVisible();
    await signInWithPassword(page, LEGACY_EMAIL!, NEW_LEGACY_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await sessionEmail(page)).toBe(LEGACY_EMAIL);
    await signOut(page);
  });

  await test.step("an email sign-in link signs in", async () => {
    await visit(page, "/login");
    await page.locator('input[autocomplete="username webauthn"]').fill(EMAIL);
    await button(page, "Email me a sign-in link instead").click();
    await expect(page.getByText(`We sent a link to ${EMAIL}`)).toBeVisible();
    await page.goto(await mailedLink(EMAIL, "/api/auth/magic-link/verify"));
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await sessionEmail(page)).toBe(EMAIL);
  });
});
