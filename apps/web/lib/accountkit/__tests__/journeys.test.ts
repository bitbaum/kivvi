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
      AUTH_RUNTIME: "accountkit",
      NEXTAUTH_SECRET: "synthetic-kivvi-journey-secret-at-least-32-chars",
    });
    delete process.env.RESEND_API_KEY;
    delete process.env.BETTER_AUTH_SECRET;
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

  test("Kivvi's own sign-up writer reaches the shared row, so the new person signs in", async () => {
    const hash = await bcrypt.hash("a brand new password", 4);
    await sql(
      `INSERT INTO users (email, name, password_hash) VALUES ('fresh@example.test', 'Fresh', $1)`,
      [hash],
    );
    const result = await signIn("fresh@example.test", "a brand new password");
    expect(new URL(result.url).searchParams.get("error")).toBeNull();
    expect((await session()).user).toMatchObject({ email: "fresh@example.test", companyId: null });
  });

  test("changing your own password keeps your session and ends every other one", async () => {
    await signIn("owner@example.test", PASSWORD);
    const mine = browser.cookie;
    browser.cookie = "";
    await signIn("owner@example.test", PASSWORD);
    const other = browser.cookie;

    const { compat } = await import("../compat");
    const keep = await compat.sessionIdFor(new Headers({ cookie: mine }));
    expect(keep).toBeTruthy();
    const hash = await bcrypt.hash("the new password", 4);
    const { db } = await import("@/lib/db");
    await (db as any).$client.begin(async (tx: any) => {
      await tx.unsafe("SELECT set_config('kivvi.keep_session', $1, true)", [keep]);
      await tx.unsafe("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, OWNER]);
    });

    browser.cookie = mine;
    expect((await session())?.user?.id, "the changing session stays").toBe(OWNER);
    browser.cookie = other;
    expect(await session(), "every other session ends").toBeNull();

    browser.cookie = "";
    const old = await signIn("owner@example.test", PASSWORD);
    expect(new URL(old.url).searchParams.get("error")).toBe("CredentialsSignin");
    const fresh = await signIn("owner@example.test", "the new password");
    expect(new URL(fresh.url).searchParams.get("error")).toBeNull();
  });

  test("a reset through Kivvi's link ends every session", async () => {
    await signIn("owner@example.test", PASSWORD);
    await sql("UPDATE users SET password_hash = $1 WHERE id = $2", [
      await bcrypt.hash("reset password", 4),
      OWNER,
    ]);
    expect(await session()).toBeNull();
  });

  test("AccountKit's own credential writers stay closed until Kivvi adopts its screens", async () => {
    for (const route of ["/sign-up/email", "/change-password", "/request-password-reset"]) {
      const res = await answer(request(route, { form: { email: "x@example.test" } }));
      expect(res.status, route).toBe(404);
    }
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
