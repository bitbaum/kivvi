/**
 * What is Kivvi's own on AccountKit's endpoints (`plugins` in runtime.ts):
 *
 * - Deleting an account (AccountKit's panel) removes the Kivvi person too
 *   (the auth_users → users mirror, migration 0039). Kivvi is a books system,
 *   so that is refused, before anything is deleted, when it cannot be done
 *   cleanly: the person is named on business records that must be kept (a
 *   document, a journal entry, an audit row), or is the only owner of a
 *   company that other people work in. The refusal says what to do instead.
 * - An email sign-in link to a new address creates the person without a
 *   sign-in method, so AccountKit's onAccountCreated never runs; the link's
 *   landing makes the Kivvi row instead.
 */
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { and, eq, sql } from "drizzle-orm";
import { memberships, users } from "@kivvi/database";
import { db } from "@/lib/db";
import { ensureKivviUser } from "./accounts";

const DELETE_PATHS = ["/delete-user", "/delete-user/callback"];
const CREATING_PATHS = ["/magic-link/verify"];

export type DeletionRefusal = "records" | "soleOwner";

const REFUSALS: Record<"de" | "en" | "fr", Record<DeletionRefusal, string>> = {
  de: {
    records:
      "Ihr Konto steht auf Geschäftsbelegen, die aufbewahrt werden müssen, und kann deshalb nicht gelöscht werden. Bitten Sie die Inhaberin oder den Inhaber Ihrer Firma, Sie aus dem Team zu entfernen.",
    soleOwner:
      "Sie sind die einzige Inhaberin oder der einzige Inhaber einer Firma mit weiteren Mitgliedern. Machen Sie unter Einstellungen → Team ein anderes Mitglied zur Inhaberin oder zum Inhaber, dann können Sie Ihr Konto löschen.",
  },
  en: {
    records:
      "Your account is named on business records that must be kept, so it cannot be deleted. Ask your company's owner to remove you from the team instead.",
    soleOwner:
      "You are the only owner of a company that other people work in. Make another member an owner under Settings → Team, then you can delete your account.",
  },
  fr: {
    records:
      "Votre compte figure sur des pièces comptables qui doivent être conservées ; il ne peut donc pas être supprimé. Demandez au propriétaire de votre entreprise de vous retirer de l'équipe.",
    soleOwner:
      "Vous êtes le seul propriétaire d'une entreprise qui compte d'autres membres. Nommez un autre membre propriétaire sous Paramètres → Équipe, puis vous pourrez supprimer votre compte.",
  },
};

/** The language Kivvi shows this request in (i18n/request.ts): cookie, then Accept-Language. */
export function refusalLanguage(headers: Headers | undefined): "de" | "en" | "fr" {
  const cookie = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(headers?.get("cookie") ?? "")?.[1];
  if (cookie === "fr" || cookie === "en") return cookie;
  if (cookie === "de-CH") return "de";
  const accept = headers?.get("accept-language") ?? "";
  if (/\bfr\b/i.test(accept)) return "fr";
  if (/\ben\b/i.test(accept)) return "en";
  return "de";
}

export function refusalText(reason: DeletionRefusal, headers?: Headers): string {
  return REFUSALS[refusalLanguage(headers)][reason];
}

const ROLLBACK = Symbol("rollback");

/** Why this person cannot be deleted, or null when deleting is clean. Changes nothing. */
export async function deletionRefusal(userId: string): Promise<DeletionRefusal | null> {
  // The only owner of a company others still work in.
  const [orphaning] = await db
    .select({ companyId: memberships.companyId })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, "owner"),
        sql`NOT EXISTS (SELECT 1 FROM memberships o WHERE o.company_id = ${memberships.companyId}
              AND o.user_id <> ${userId} AND o.role = 'owner')`,
        sql`EXISTS (SELECT 1 FROM memberships m WHERE m.company_id = ${memberships.companyId}
              AND m.user_id <> ${userId})`,
      ),
    )
    .limit(1);
  if (orphaning) return "soleOwner";

  // Records that reference the person without a cascade (documents, journal,
  // audit log) make the deletion fail: try it, and always roll it back.
  try {
    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.id, userId));
      throw ROLLBACK;
    });
  } catch (error) {
    if (error === ROLLBACK) return null;
    const code =
      (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code;
    if (code === "23503") return "records";
    throw error;
  }
  return null;
}

export function kivviPlugin(): BetterAuthPlugin {
  return {
    id: "kivvi",
    hooks: {
      before: [
        {
          matcher: ({ path }) => Boolean(path && DELETE_PATHS.includes(path)),
          handler: createAuthMiddleware(async (ctx) => {
            const current = await getSessionFromCtx(ctx, { disableRefresh: true });
            if (!current) return;
            const reason = await deletionRefusal(current.user.id);
            if (reason) {
              throw new APIError("FORBIDDEN", {
                code: "KIVVI_ACCOUNT_KEPT",
                message: refusalText(reason, ctx.request?.headers ?? ctx.headers),
              });
            }
          }),
        },
      ],
      after: [
        {
          matcher: ({ path }) => Boolean(path && CREATING_PATHS.includes(path)),
          handler: createAuthMiddleware(async (ctx) => {
            const userId = ctx.context.newSession?.user.id;
            if (!userId) return;
            await ensureKivviUser({ userId }).catch((error) =>
              console.error("[auth] Kivvi user for an email-link sign-up failed", {
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }),
        },
      ],
    },
  };
}
