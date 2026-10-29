import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";
import { applicationSecret } from "@/lib/integration-secrets";

/**
 * The company's own AI provider key, at rest.
 *
 * Stored as `cak:<version>:<base64url(iv | tag | ciphertext)>`, AES-256-GCM.
 *
 * - The key is derived with HKDF from the app secret under its own label, so it
 *   is not the key the integration secrets use, even though both start from the
 *   same secret (no new env var on the box).
 * - The company id is bound in as associated data: a value copied into another
 *   company's settings does not decrypt there.
 * - The version names the derivation. Rotating means adding a version below and
 *   pointing CURRENT_VERSION at it; every read of an older version reports
 *   `stale`, and the read-and-rewrite path seals it again under the new one.
 * - When the app secret itself changes, an old value no longer decrypts. That
 *   is reported as `unreadable` and chat refuses, so the admin hears about it
 *   instead of chats quietly going somewhere else.
 *
 * Nothing here logs or returns a key except `openCompanyAiKey`'s result.
 */

const SCHEME = "cak";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const KEY_VERSIONS: Record<string, { label: string }> = {
  v1: { label: "kivvi/company-ai-key/v1" },
};
export const CURRENT_VERSION = "v1";

function derivedKey(version: string): Buffer {
  const spec = KEY_VERSIONS[version];
  if (!spec) throw new Error(`Unknown company AI key version: ${version}`);
  return Buffer.from(
    hkdfSync("sha256", applicationSecret(), "kivvi:company-ai-key", spec.label, 32),
  );
}

function associatedData(companyId: string): Buffer {
  return Buffer.from(`company:${companyId}`, "utf8");
}

/** True when the stored value is in the sealed format (any version). */
export function isSealedCompanyAiKey(stored: string | undefined | null): boolean {
  return Boolean(stored?.startsWith(`${SCHEME}:`));
}

/** Seal a key for one company under the current version. */
export function sealCompanyAiKey(companyId: string, apiKey: string): string {
  if (!companyId) throw new Error("A company id is required to seal its AI key");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", derivedKey(CURRENT_VERSION), iv);
  cipher.setAAD(associatedData(companyId));
  const encrypted = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  return `${SCHEME}:${CURRENT_VERSION}:${payload}`;
}

export type OpenedCompanyAiKey =
  /** No key stored. */
  | { status: "none" }
  /** Sealed and readable. `stale` = sealed under an older version; seal it again. */
  | { status: "sealed"; key: string; stale: boolean }
  /** Saved before encryption existed. Usable, but must be sealed. */
  | { status: "plaintext"; key: string }
  /** Sealed, but it does not open: the app secret changed, it was moved, or it is damaged. */
  | { status: "unreadable" };

/** Read what is stored for this company. Never throws. */
export function openCompanyAiKey(
  companyId: string,
  stored: string | undefined | null,
): OpenedCompanyAiKey {
  if (!stored) return { status: "none" };
  if (!isSealedCompanyAiKey(stored)) return { status: "plaintext", key: stored.trim() };

  const [, version, payload] = stored.split(":");
  try {
    if (!version || !payload) throw new Error("malformed");
    const bytes = Buffer.from(payload, "base64url");
    if (bytes.length <= IV_BYTES + TAG_BYTES) throw new Error("malformed");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      derivedKey(version),
      bytes.subarray(0, IV_BYTES),
    );
    decipher.setAAD(associatedData(companyId));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const key = Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
    return { status: "sealed", key, stale: version !== CURRENT_VERSION };
  } catch {
    return { status: "unreadable" };
  }
}

/**
 * The value that should replace `stored`, or null when nothing needs to change.
 * Plaintext and older-version values are sealed under the current version;
 * an unreadable value is left alone (only the admin can replace it).
 */
export function resealCompanyAiKey(companyId: string, stored: string | undefined | null) {
  const opened = openCompanyAiKey(companyId, stored);
  if (opened.status === "plaintext" || (opened.status === "sealed" && opened.stale)) {
    return sealCompanyAiKey(companyId, opened.key);
  }
  return null;
}
