// @vitest-environment node
/**
 * Kivvi's ways in on the shared runtime: the calls `next-auth/react` makes,
 * answered by AccountKit, on the committed migration chain plus the real
 * cutover import and its mirror triggers.
 *
 * Needs a disposable PostgreSQL with every packages/database/drizzle file applied:
 *   KIVVI_JOURNEY_DATABASE_URL=postgres://…  pnpm --filter @kivvi/web exec vitest run lib/accountkit
 * CI's account job runs it after applying the chain. Without the variable it is
 * skipped. It TRUNCATEs `users` (cascade): never point it at a database anyone uses.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createCompatClient } from "@bitbaum/accountkit/auth/compat-testing";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

const URL_ = process.env.KIVVI_JOURNEY_DATABASE_URL;
const SITE = "https://kivvi.example.test";
vi.hoisted(() => {
  const url = process.env.KIVVI_JOURNEY_DATABASE_URL;
  if (url) {
    Object.assign(process.env, {
      DATABASE_URL: url,
      NEXTAUTH_URL: "https://kivvi.example.test",
      NEXTAUTH_SECRET: "synthetic-kivvi-journey-secret-at-least-32-chars",
    });
    delete process.env.RESEND_API_KEY;
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.ORANGECAT_OAUTH_CLIENT_ID;
    delete process.env.SIGNIN_CLIENT_ID;
  }
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, delete: () => undefined }),
}));

const PASSWORD = "synthetic legacy password";
const OWNER = "00000000-0000-4000-8000-000000000001";
const NEWCOMER = "00000000-0000-4000-8000-000000000002";
const COMPANY = "00000000-0000-4000-8000-0000000000c1";
const OTHER_COMPANY = "00000000-0000-4000-8000-0000000000c2";
const IMPORT_SQL = path.resolve(__dirname, "../../../../../scripts/db/accountkit-import.sql");

describe.skipIf(!URL_)("Kivvi on AccountKit (real PostgreSQL)", () => {
  let browser: ReturnType<typeof createCompatClient>;

  async function sql(text: string, params: unknown[] = []) {
    const { db } = await import("@/lib/db");
    return (db as any).$client.unsafe(text, params);
  }

  afterAll(async () => {
    const { db } = await import("@/lib/db");
    await (db as any).$client.end();
  });

  beforeEach(async () => {
    browser = createCompatClient({ compat: (await import("../compat")).compat, site: SITE });
    await sql(`DROP TRIGGER IF EXISTS kivvi_accountkit_from_users ON users;
      DROP TRIGGER IF EXISTS kivvi_accountkit_to_users ON auth_users;
      DROP TRIGGER IF EXISTS kivvi_accountkit_delete_users ON auth_users;
      TRUNCATE auth_users, auth_accounts, auth_sessions, auth_verifications,
        auth_passkeys, auth_two_factors, users, companies CASCADE`);
    await sql(
      `INSERT INTO companies (id, name, settings) VALUES
        ($1, 'Werkstatt Eins', '{"onboardingCompletedAt":"2026-10-01T00:00:00Z","enabledModules":["sales"]}'),
        ($2, 'Werkstatt Zwei', '{}')`,
      [COMPANY, OTHER_COMPANY],
    );
    const hash = await bcrypt.hash(PASSWORD, 4);
    await sql(
      `INSERT INTO users (id, email, name, password_hash, company_id) VALUES
        ($1, 'Owner@Example.test', 'Owner', $3, $4),
        ($2, 'newcomer@example.test', 'New', $3, NULL)`,
      [OWNER, NEWCOMER, hash, COMPANY],
    );
    await sql(
      `INSERT INTO memberships (user_id, company_id, role) VALUES
        ($1, $2, 'owner'), ($1, $3, 'member')`,
      [OWNER, COMPANY, OTHER_COMPANY],
    );
    await importAccounts();
  });

  async function importAccounts() {
    const { db } = await import("@/lib/db");
    const script = await readFile(IMPORT_SQL, "utf8");
    await (db as any).$client.begin((tx: any) => tx.unsafe(script));
  }

  // The shared test client, in this file's request/answer shape.
  const request = (route: string, init: { form?: Record<string, string>; get?: boolean } = {}) => ({
    route,
    form: init.form,
  });
  const answer = (req: ReturnType<typeof request>) => browser.call(req.route, req.form);
  const signIn = (email: string, password: string) =>
    browser.signIn("credentials", { email, password }, `${SITE}/dashboard`);
  const session = () => browser.session<any>();

  // What AccountKit's screens send: JSON to its own endpoints, same cookie jar.
  let hop = 0;
  async function native(route: string, body: Record<string, unknown>) {
    const { compat } = await import("../compat");
    hop += 1;
    const res = await compat.route.POST(
      new Request(`${SITE}/api/auth${route}`, {
        method: "POST",
        headers: {
          origin: SITE,
          "content-type": "application/json",
          "x-forwarded-for": `203.0.113.${hop % 250}`,
          cookie: browser.cookie,
        },
        body: JSON.stringify(body),
      }) as never,
    );
    const jar = new Map(
      browser.cookie
        .split("; ")
        .filter(Boolean)
        .map((part) => [part.slice(0, part.indexOf("=")), part.slice(part.indexOf("=") + 1)]),
    );
    for (const set of res.headers.getSetCookie()) {
      const [pair] = set.split(";");
      const name = pair.slice(0, pair.indexOf("="));
      const value = pair.slice(pair.indexOf("=") + 1);
      if (/max-age=0/i.test(set) || value === "") jar.delete(name);
      else jar.set(name, value);
    }
    browser.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    return res;
  }

  test("an imported bcrypt account signs in, in any letter case, with its company claims", async () => {
    const result = await signIn("OWNER@example.test", PASSWORD);
    expect(new URL(result.url).searchParams.get("error")).toBeNull();
    expect(result.url).toBe(`${SITE}/dashboard`);
    const current = await session();
    expect(current.user).toMatchObject({
      id: OWNER,
      email: "Owner@Example.test",
      companyId: COMPANY,
      companyName: "Werkstatt Eins",
      role: "owner",
      onboardingComplete: true,
      enabledModules: ["sales"],
    });
  });

  test("a wrong password or an unknown address is refused the way the login page reads it", async () => {
    for (const [email, password] of [
      ["owner@example.test", "not the password"],
      ["nobody@example.test", PASSWORD],
    ]) {
      const result = await signIn(email, password);
      expect(new URL(result.url).searchParams.get("error")).toBe("CredentialsSignin");
      expect(await session()).toBeNull();
    }
  });

  test("sign-out ends the session (the client checks for null)", async () => {
    await signIn("owner@example.test", PASSWORD);
    expect((await session())?.user?.id).toBe(OWNER);
    const out = await answer(request("/signout", { form: { csrfToken: "x" } }));
    expect((await out.json()).url).toBe(`${SITE}/login`);
    expect(await session()).toBeNull();
    expect(Number((await sql("SELECT count(*) FROM auth_sessions"))[0].count)).toBe(0);
  });

  test("a company switch or a role change applies on the next request, without update()", async () => {
    await signIn("owner@example.test", PASSWORD);
    await sql("UPDATE users SET company_id = $1 WHERE id = $2", [OTHER_COMPANY, OWNER]);
    expect((await session()).user).toMatchObject({
      companyId: OTHER_COMPANY,
      role: "member",
      onboardingComplete: false,
    });
    // useSession().update() posts to /session; the answer is the same fresh read.
    const updated = await (await answer(request("/session", { form: { data: "{}" } }))).json();
    expect(updated.user.companyName).toBe("Werkstatt Zwei");
  });

  test("a deleted person is signed out at once", async () => {
    await signIn("owner@example.test", PASSWORD);
    await sql("DELETE FROM users WHERE id = $1", [OWNER]);
    expect(await session()).toBeNull();
    expect(Number((await sql("SELECT count(*) FROM auth_users"))[0].count)).toBe(1);
  });

  test("a users row written outside AccountKit (Loki's live proof) reaches the shared row", async () => {
    const hash = await bcrypt.hash("a brand new password", 4);
    await sql(
      `INSERT INTO users (email, name, password_hash) VALUES ('fresh@example.test', 'Fresh', $1)`,
      [hash],
    );
    const result = await signIn("fresh@example.test", "a brand new password");
    expect(new URL(result.url).searchParams.get("error")).toBeNull();
    expect((await session()).user).toMatchObject({ email: "fresh@example.test", companyId: null });
  });

  test("a sign-up through AccountKit makes a Kivvi person under the same id, with no company yet", async () => {
    const res = await native("/sign-up/email", {
      name: "",
      email: "Fresh@Example.test",
      password: "a brand new password",
    });
    expect(res.status).toBe(200);
    const { user } = await res.json();
    const [row] = await sql(
      "SELECT email, name, company_id, password_hash FROM users WHERE id = $1",
      [user.id],
    );
    expect(row).toMatchObject({
      email: "fresh@example.test",
      name: null,
      company_id: null,
      password_hash: null,
    });
    expect((await session()).user).toMatchObject({ id: user.id, companyId: null });
    browser.cookie = "";
    const again = await native("/sign-in/email", {
      email: "fresh@example.test",
      password: "a brand new password",
    });
    expect(again.status).toBe(200);
  });

  test("an imported bcrypt account signs in through AccountKit's form, wrong password refused", async () => {
    expect(
      (await native("/sign-in/email", { email: "owner@example.test", password: "nope" })).status,
    ).toBe(401);
    expect(await session()).toBeNull();
    const res = await native("/sign-in/email", { email: "OWNER@example.test", password: PASSWORD });
    expect(res.status).toBe(200);
    expect((await session()).user).toMatchObject({ id: OWNER, companyId: COMPANY, role: "owner" });
  });

  test("a password change through AccountKit replaces the imported hash", async () => {
    await native("/sign-in/email", { email: "owner@example.test", password: PASSWORD });
    const res = await native("/change-password", {
      currentPassword: PASSWORD,
      newPassword: "the new password",
      revokeOtherSessions: true,
    });
    expect(res.status).toBe(200);
    browser.cookie = "";
    expect(
      (await native("/sign-in/email", { email: "owner@example.test", password: PASSWORD })).status,
    ).toBe(401);
    expect(
      (
        await native("/sign-in/email", {
          email: "owner@example.test",
          password: "the new password",
        })
      ).status,
    ).toBe(200);
  });

  test("a rename through AccountKit's panel reaches Kivvi's row", async () => {
    await native("/sign-in/email", { email: "owner@example.test", password: PASSWORD });
    expect((await native("/update-user", { name: "Panel Name" })).status).toBe(200);
    expect((await session()).user.name).toBe("Panel Name");
    expect((await sql("SELECT name FROM users WHERE id = $1", [OWNER]))[0].name).toBe("Panel Name");
  });

  test("deleting an account through AccountKit deletes the Kivvi person and their memberships", async () => {
    await sql("INSERT INTO memberships (user_id, company_id, role) VALUES ($1, $2, 'member')", [
      NEWCOMER,
      OTHER_COMPANY,
    ]);
    await native("/sign-in/email", { email: "newcomer@example.test", password: PASSWORD });
    const res = await native("/delete-user", { password: PASSWORD });
    expect(res.status).toBe(200);
    expect(await sql("SELECT 1 FROM users WHERE id = $1", [NEWCOMER])).toHaveLength(0);
    expect(await sql("SELECT 1 FROM memberships WHERE user_id = $1", [NEWCOMER])).toHaveLength(0);
    expect(await sql("SELECT 1 FROM auth_users WHERE id = $1", [NEWCOMER])).toHaveLength(0);
    expect(await session()).toBeNull();
  });

  test("a person named on kept records is refused deletion, and keeps every way in", async () => {
    await sql(
      `INSERT INTO audit_log (company_id, actor_user_id, action, entity_type) VALUES ($1, $2, 'journal.posted', 'journal_entry')`,
      [OTHER_COMPANY, NEWCOMER],
    );
    await native("/sign-in/email", { email: "newcomer@example.test", password: PASSWORD });
    const res = await native("/delete-user", { password: PASSWORD });
    expect(res.status).toBe(403);
    expect((await res.json()).message).toMatch(/business records|Geschäftsbelegen/);
    expect((await session())?.user?.id).toBe(NEWCOMER);
    expect(await sql("SELECT 1 FROM auth_accounts WHERE user_id = $1", [NEWCOMER])).toHaveLength(1);
    browser.cookie = "";
    expect(
      (await native("/sign-in/email", { email: "newcomer@example.test", password: PASSWORD }))
        .status,
    ).toBe(200);
  });

  test("the only owner of a company others work in is refused deletion", async () => {
    await sql("INSERT INTO memberships (user_id, company_id, role) VALUES ($1, $2, 'member')", [
      NEWCOMER,
      COMPANY,
    ]);
    await native("/sign-in/email", { email: "owner@example.test", password: PASSWORD });
    const res = await native("/delete-user", { password: PASSWORD });
    expect(res.status).toBe(403);
    expect(await sql("SELECT 1 FROM users WHERE id = $1", [OWNER])).toHaveLength(1);
  });

  test("a person AccountKit creates itself (OrangeCat, an email link) gets a Kivvi row once", async () => {
    const { ensureKivviUser } = await import("../accounts");
    const id = "00000000-0000-4000-8000-0000000000aa";
    await sql(
      `INSERT INTO auth_users (id, name, email) VALUES ($1, 'New', 'abc@orangecat.invalid')`,
      [id],
    );
    await ensureKivviUser({ userId: id });
    await ensureKivviUser({ userId: id });
    expect(await sql("SELECT email, name, company_id FROM users WHERE id = $1", [id])).toEqual([
      { email: "abc@orangecat.invalid", name: "New", company_id: null },
    ]);
  });

  test("OrangeCat and the bitbaum sign-in are offered only with their clients configured", async () => {
    const { kivviMethods } = await import("../methods");
    expect(kivviMethods()).toMatchObject({ orangecat: false, signin: false, password: true });
    expect(
      kivviMethods({
        ...process.env,
        ORANGECAT_OAUTH_CLIENT_ID: "kivvi",
        ORANGECAT_OAUTH_CLIENT_SECRET: "s",
        SIGNIN_ISSUER: "https://signin.example.test",
        SIGNIN_CLIENT_ID: "kivvi",
        SIGNIN_CLIENT_SECRET: "s",
      }),
      // The shared sign-in shows only once its service publishes a provider
      // (AccountKit 0.24+); this synthetic issuer publishes none.
    ).toMatchObject({ orangecat: true, signin: false, passkey: true, twoFactor: true });
  });

  test("the import is a no-op for the same snapshot and refuses drift", async () => {
    await importAccounts();
    // A write that bypassed the mirror (the trigger detached) is drift.
    await sql(`DROP TRIGGER kivvi_accountkit_from_users ON users`);
    await sql("UPDATE users SET email = 'moved@example.test' WHERE id = $1", [NEWCOMER]);
    await expect(importAccounts()).rejects.toThrow(/snapshot differs/);
  });

  test("the import refuses addresses that collide once lower-cased", async () => {
    await sql(`DROP TRIGGER kivvi_accountkit_from_users ON users;
      TRUNCATE auth_users CASCADE`);
    await sql(`INSERT INTO users (email, name) VALUES ('owner@example.test', 'Twin')`);
    await expect(importAccounts()).rejects.toThrow(/address reconciliation/);
  });
});
