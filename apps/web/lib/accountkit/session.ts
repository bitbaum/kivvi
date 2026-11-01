/**
 * Kivvi's session shape, answered from a shared AccountKit session. Every
 * request rereads the `users` row and the membership, so a company switch, a
 * finished onboarding, a role change or a deleted account applies at once —
 * the client's `update()` has nothing left to carry.
 */
import * as React from "react";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { sessionUserFor } from "@/lib/session-claims";
import { sharedAuth } from "./runtime";

type SharedSession = { user: { id: string }; session: { expiresAt: Date | string } };

export async function kivviSession(shared: SharedSession | null): Promise<Session | null> {
  if (!shared) return null;
  const user = await sessionUserFor(db, shared.user.id);
  if (!user) return null;
  return { user, expires: new Date(shared.session.expiresAt).toISOString() };
}

/** The session of this request (server components, route handlers, actions). */
// React.cache dedupes per request on the server; plain React 18 (tests) has none.
const cache: <T extends (...args: never[]) => unknown>(fn: T) => T = React.cache ?? ((fn) => fn);

export const sharedSession = cache(async () => kivviSession(await sharedAuth.getSession()));

/** The session behind request headers (middleware, the /session endpoint). */
export async function sharedSessionFor(headers: Headers): Promise<Session | null> {
  return kivviSession(await sharedAuth.sessionFor(headers).catch(() => null));
}

/** The shared session id behind these headers, for "keep this session" writes. */
export async function sharedSessionId(headers: Headers): Promise<string | null> {
  const shared = await sharedAuth.sessionFor(headers).catch(() => null);
  return shared?.session.id ?? null;
}
