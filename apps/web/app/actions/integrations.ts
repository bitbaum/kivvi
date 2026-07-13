"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Decimal from "decimal.js";
import net from "node:net";
import tls from "node:tls";
import { db } from "@/lib/db";
import {
  contacts,
  externalIntegrationItems,
  inventoryItems,
  companies,
} from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { createContact } from "@kivvi/core";
import {
  mailIntegrationSchema,
  maskSecret,
  mergeMailIntegration,
  mergeNextcloudIntegration,
  nextcloudIntegrationSchema,
  type MailIntegrationInput,
  type NextcloudIntegrationInput,
} from "@kivvi/core/src/domain/integrations";
import { buildRicardoListingPayload } from "@kivvi/core/src/domain/ricardo";
import { PUBLIC_ITEM_STATUSES } from "@kivvi/core/src/config/item-status-sets";
import {
  publishListing,
  deleteListing,
  testConnection,
} from "@/lib/ricardo-client";
import { requireRole, safeErrorMessage, type ActionResult } from "./utils";
import { createAction } from "./action-factory";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/lib/integration-secrets";

const INTEGRATION_TEST_TIMEOUT_MS = 8000;
const INTEGRATION_SYNC_LIMIT = 20;

function sanitizeIntegrationError(error: unknown): string {
  if (!(error instanceof Error)) return "Connection failed";
  if (error.name === "AbortError") return "Connection timed out";
  return error.message.replace(/\"[^"]{12,}\"/g, '"[redacted]"');
}

async function loadCompanySettings(companyId: string) {
  const [existing] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  return (existing?.settings as CompanySettings) ?? {};
}

async function saveCompanySettings(
  companyId: string,
  settings: CompanySettings,
) {
  await db
    .update(companies)
    .set({ settings, updatedAt: new Date() })
    .where(eq(companies.id, companyId));
}

async function testNextcloudWebDavConnection(
  input: Required<
    Pick<
      NextcloudIntegrationInput,
      "baseUrl" | "username" | "appPassword" | "folderPath"
    >
  >,
) {
  const baseUrl = input.baseUrl.replace(/\/+$/g, "");
  const folder = input.folderPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const username = encodeURIComponent(input.username);
  const url = `${baseUrl}/remote.php/dav/files/${username}/${folder}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${input.username}:${input.appPassword}`,
        ).toString("base64")}`,
        Depth: "0",
      },
      signal: controller.signal,
    });

    if (![200, 207].includes(response.status)) {
      throw new Error(`Nextcloud returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNextcloudItems(
  input: Required<
    Pick<
      NextcloudIntegrationInput,
      "baseUrl" | "username" | "appPassword" | "folderPath"
    >
  >,
) {
  const baseUrl = input.baseUrl.replace(/\/+$/g, "");
  const folder = input.folderPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const username = encodeURIComponent(input.username);
  const url = `${baseUrl}/remote.php/dav/files/${username}/${folder}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${input.username}:${input.appPassword}`,
        ).toString("base64")}`,
        Depth: "1",
      },
      signal: controller.signal,
    });

    if (![200, 207].includes(response.status)) {
      throw new Error(`Nextcloud returned HTTP ${response.status}`);
    }

    return parseDavResponses(await response.text(), baseUrl).slice(
      0,
      INTEGRATION_SYNC_LIMIT,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function quoteImap(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function decodeHeaderValue(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/=\?utf-8\?q\?([^?]+)\?=/gi, (_, encoded: string) =>
      encoded
        .replace(/_/g, " ")
        .replace(/=([a-f0-9]{2})/gi, (_m, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        ),
    )
    .replace(/=\?utf-8\?b\?([^?]+)\?=/gi, (_, encoded: string) =>
      Buffer.from(encoded, "base64").toString("utf8"),
    )
    .trim();
}

function parseAddress(value: string | undefined) {
  const decoded = decodeHeaderValue(value);
  const match = decoded.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) {
    return {
      name: decoded.includes("@") ? "" : decoded,
      email: decoded.includes("@") ? decoded : "",
    };
  }
  return {
    name: match[1].replace(/^"|"$/g, "").trim(),
    email: match[2].trim(),
  };
}

function parseMailHeaders(raw: string) {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  const get = (name: string) =>
    unfolded.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1]?.trim();
  const from = parseAddress(get("from"));
  const messageId = get("message-id")?.replace(/[<>]/g, "") || "";
  const subject = decodeHeaderValue(get("subject")) || "(no subject)";
  const date = get("date");

  return {
    externalId: messageId || `${from.email}:${subject}:${date || ""}`,
    title: subject,
    fromName: from.name || undefined,
    fromEmail: from.email || undefined,
    occurredAt: date ? new Date(date) : undefined,
    raw: { headers: raw },
  };
}

async function fetchRecentImapHeaders(input: MailIntegrationInput) {
  return new Promise<ReturnType<typeof parseMailHeaders>[]>(
    (resolve, reject) => {
      const socket = input.useTls
        ? tls.connect({
            host: input.host,
            port: input.port,
            servername: input.host,
            timeout: INTEGRATION_TEST_TIMEOUT_MS,
          })
        : net.connect({
            host: input.host,
            port: input.port,
            timeout: INTEGRATION_TEST_TIMEOUT_MS,
          });
      let buffer = "";
      let selected = false;
      let fetched = false;
      let done = false;

      const finish = (error?: Error) => {
        if (done) return;
        done = true;
        socket.destroy();
        if (error) reject(error);
      };

      socket.setTimeout(INTEGRATION_TEST_TIMEOUT_MS * 2);
      socket.on("timeout", () => finish(new Error("Connection timed out")));
      socket.on("error", finish);
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        if (buffer.includes("* OK") && !buffer.includes("a1 ")) {
          socket.write(
            `a1 LOGIN ${quoteImap(input.username)} ${quoteImap(input.password)}\r\n`,
          );
        }
        if (buffer.includes("a1 OK") && !selected) {
          selected = true;
          socket.write(`a2 SELECT ${quoteImap(input.mailbox || "INBOX")}\r\n`);
        }
        if (buffer.includes("a2 OK") && !fetched) {
          fetched = true;
          socket.write(
            `a3 FETCH 1:* (BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])\r\n`,
          );
        }
        if (buffer.includes("a1 NO") || buffer.includes("a1 BAD")) {
          finish(new Error("IMAP login failed"));
        }
        if (buffer.includes("a2 NO") || buffer.includes("a2 BAD")) {
          finish(new Error("IMAP mailbox could not be opened"));
        }
        if (buffer.includes("a3 OK")) {
          socket.write("a4 LOGOUT\r\n");
          const headerBlocks = buffer
            .split(/\* \d+ FETCH/g)
            .slice(1)
            .map((part) => part.replace(/\)\r?\n.*$/s, "").trim())
            .filter((part) => /subject:|from:|message-id:/i.test(part));
          resolve(
            headerBlocks.slice(-INTEGRATION_SYNC_LIMIT).map(parseMailHeaders),
          );
          finish();
        }
        if (buffer.includes("a3 NO") || buffer.includes("a3 BAD")) {
          finish(new Error("IMAP messages could not be fetched"));
        }
      });
    },
  );
}

function parseDavResponses(xml: string, baseUrl: string) {
  const responses = xml.match(/<d?:response[\s\S]*?<\/d?:response>/gi) || [];
  return responses
    .map((response) => {
      const href = response.match(/<d?:href>([\s\S]*?)<\/d?:href>/i)?.[1] || "";
      const decodedHref = decodeURIComponent(href);
      const name =
        response.match(/<d?:displayname>([\s\S]*?)<\/d?:displayname>/i)?.[1] ||
        decodedHref.split("/").filter(Boolean).pop() ||
        "Nextcloud file";
      const size = response.match(
        /<d?:getcontentlength>([\s\S]*?)<\/d?:getcontentlength>/i,
      )?.[1];
      const modified = response.match(
        /<d?:getlastmodified>([\s\S]*?)<\/d?:getlastmodified>/i,
      )?.[1];
      return {
        externalId: decodedHref,
        title: name,
        summary: size ? `${Number(size).toLocaleString()} bytes` : undefined,
        occurredAt: modified ? new Date(modified) : undefined,
        url: `${baseUrl.replace(/\/+$/g, "")}${href}`,
        raw: { href: decodedHref, size: size ? Number(size) : undefined },
      };
    })
    .filter((item) => item.externalId && !item.externalId.endsWith("/"));
}

async function testImapConnection(input: MailIntegrationInput) {
  await new Promise<void>((resolve, reject) => {
    const socket = input.useTls
      ? tls.connect({
          host: input.host,
          port: input.port,
          servername: input.host,
          timeout: INTEGRATION_TEST_TIMEOUT_MS,
        })
      : net.connect({
          host: input.host,
          port: input.port,
          timeout: INTEGRATION_TEST_TIMEOUT_MS,
        });
    let buffer = "";
    let done = false;

    const finish = (error?: Error) => {
      if (done) return;
      done = true;
      socket.destroy();
      error ? reject(error) : resolve();
    };

    socket.setTimeout(INTEGRATION_TEST_TIMEOUT_MS);
    socket.on("timeout", () => finish(new Error("Connection timed out")));
    socket.on("error", finish);
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.includes("* OK") && !buffer.includes("a1 ")) {
        socket.write(
          `a1 LOGIN ${quoteImap(input.username)} ${quoteImap(input.password)}\r\n`,
        );
      }
      if (buffer.includes("a1 OK")) {
        socket.write("a2 LOGOUT\r\n");
        finish();
      }
      if (buffer.includes("a1 NO") || buffer.includes("a1 BAD")) {
        finish(new Error("IMAP login failed"));
      }
    });
  });
}

// ============================================================================
// RICARDO SETTINGS
// ============================================================================

export const updateRicardoApiKeyAction = createAction<string | null, void>({
  handler: async (apiKey, { companyId, db }) => {
    if (apiKey === "••••••••") return;

    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const current = (existing?.settings as CompanySettings) ?? {};

    const updatedSettings: CompanySettings = {
      ...current,
      ...(apiKey ? { ricardoApiKey: apiKey } : { ricardoApiKey: undefined }),
    };

    await db
      .update(companies)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  },
  revalidate: ["/settings/integrations"],
  errorMessage: () =>
    getTranslations("settings.integrations").then((t) => t("errorSaveApiKey")),
  minRole: "admin",
});

// ============================================================================
// NEXTCLOUD / MAIL SETTINGS
// ============================================================================

export const updateNextcloudIntegrationAction = createAction<
  NextcloudIntegrationInput,
  void
>({
  handler: async (input, { companyId }) => {
    const settings = await loadCompanySettings(companyId);
    if (input.appPassword === maskSecret(settings.nextcloud?.appPassword)) {
      if (!settings.nextcloud?.appPassword) {
        throw new Error("Invalid Nextcloud app password");
      }
    }

    const parsed = nextcloudIntegrationSchema.parse(input);
    const merged = mergeNextcloudIntegration(settings.nextcloud, parsed);
    await saveCompanySettings(companyId, {
      ...settings,
      nextcloud: {
        ...merged,
        appPassword: encryptIntegrationSecret(merged.appPassword),
      },
    });
  },
  revalidate: ["/settings/integrations"],
  errorMessage: "Nextcloud settings could not be saved",
  minRole: "admin",
});

export const updateMailIntegrationAction = createAction<
  MailIntegrationInput,
  void
>({
  handler: async (input, { companyId }) => {
    const settings = await loadCompanySettings(companyId);
    if (input.password === maskSecret(settings.mailIntake?.password)) {
      if (!settings.mailIntake?.password) {
        throw new Error("Invalid mailbox password");
      }
    }

    const parsed = mailIntegrationSchema.parse(input);
    const merged = mergeMailIntegration(settings.mailIntake, parsed);
    await saveCompanySettings(companyId, {
      ...settings,
      mailIntake: {
        ...merged,
        password: encryptIntegrationSecret(merged.password),
      },
    });
  },
  revalidate: ["/settings/integrations"],
  errorMessage: "Mail settings could not be saved",
  minRole: "admin",
});

export async function testNextcloudIntegrationAction(): Promise<
  ActionResult<void>
> {
  try {
    const { companyId } = await requireRole("admin");
    const settings = await loadCompanySettings(companyId);
    const connection = settings.nextcloud;

    if (
      !connection?.baseUrl ||
      !connection.username ||
      !connection.appPassword ||
      !connection.folderPath
    ) {
      return { success: false, error: "Nextcloud is not configured." };
    }

    await testNextcloudWebDavConnection({
      baseUrl: connection.baseUrl,
      username: connection.username,
      appPassword: decryptIntegrationSecret(connection.appPassword) || "",
      folderPath: connection.folderPath,
    });

    await saveCompanySettings(companyId, {
      ...settings,
      nextcloud: {
        ...connection,
        lastTestedAt: new Date().toISOString(),
        lastStatus: "ok",
        lastError: undefined,
      },
    });
    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (error) {
    try {
      const { companyId } = await requireRole("admin");
      const settings = await loadCompanySettings(companyId);
      await saveCompanySettings(companyId, {
        ...settings,
        nextcloud: settings.nextcloud
          ? {
              ...settings.nextcloud,
              lastTestedAt: new Date().toISOString(),
              lastStatus: "error",
              lastError: sanitizeIntegrationError(error),
            }
          : undefined,
      });
    } catch {
      // Keep the original error response.
    }
    return {
      success: false,
      error: sanitizeIntegrationError(error),
    };
  }
}

export async function testMailIntegrationAction(): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");
    const settings = await loadCompanySettings(companyId);
    const connection = settings.mailIntake;

    if (
      !connection?.host ||
      !connection.port ||
      !connection.username ||
      !connection.password
    ) {
      return { success: false, error: "Mailbox is not configured." };
    }

    await testImapConnection({
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: decryptIntegrationSecret(connection.password) || "",
      mailbox: connection.mailbox || "INBOX",
      useTls: connection.useTls ?? true,
      enabled: connection.enabled ?? true,
    });

    await saveCompanySettings(companyId, {
      ...settings,
      mailIntake: {
        ...connection,
        lastTestedAt: new Date().toISOString(),
        lastStatus: "ok",
        lastError: undefined,
      },
    });
    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (error) {
    try {
      const { companyId } = await requireRole("admin");
      const settings = await loadCompanySettings(companyId);
      await saveCompanySettings(companyId, {
        ...settings,
        mailIntake: settings.mailIntake
          ? {
              ...settings.mailIntake,
              lastTestedAt: new Date().toISOString(),
              lastStatus: "error",
              lastError: sanitizeIntegrationError(error),
            }
          : undefined,
      });
    } catch {
      // Keep the original error response.
    }
    return {
      success: false,
      error: sanitizeIntegrationError(error),
    };
  }
}

export async function syncNextcloudIntegrationAction(): Promise<
  ActionResult<{ imported: number }>
> {
  try {
    const { companyId } = await requireRole("admin");
    const settings = await loadCompanySettings(companyId);
    const connection = settings.nextcloud;

    if (
      !connection?.enabled ||
      !connection.baseUrl ||
      !connection.username ||
      !connection.appPassword ||
      !connection.folderPath
    ) {
      return { success: false, error: "Nextcloud is not configured." };
    }

    const items = await fetchNextcloudItems({
      baseUrl: connection.baseUrl,
      username: connection.username,
      appPassword: decryptIntegrationSecret(connection.appPassword) || "",
      folderPath: connection.folderPath,
    });

    if (items.length) {
      await db
        .insert(externalIntegrationItems)
        .values(
          items.map((item) => ({
            companyId,
            source: "nextcloud" as const,
            kind: "file" as const,
            externalId: item.externalId,
            title: item.title,
            summary: item.summary,
            occurredAt: item.occurredAt,
            url: item.url,
            raw: item.raw,
          })),
        )
        .onConflictDoNothing();
    }

    await saveCompanySettings(companyId, {
      ...settings,
      nextcloud: {
        ...connection,
        lastTestedAt: new Date().toISOString(),
        lastStatus: "ok",
        lastError: undefined,
      },
    });
    revalidatePath("/settings/integrations");
    return { success: true, data: { imported: items.length } };
  } catch (error) {
    return { success: false, error: sanitizeIntegrationError(error) };
  }
}

export async function syncMailIntegrationAction(): Promise<
  ActionResult<{ imported: number }>
> {
  try {
    const { companyId } = await requireRole("admin");
    const settings = await loadCompanySettings(companyId);
    const connection = settings.mailIntake;

    if (
      !connection?.enabled ||
      !connection.host ||
      !connection.port ||
      !connection.username ||
      !connection.password
    ) {
      return { success: false, error: "Mailbox is not configured." };
    }

    const items = await fetchRecentImapHeaders({
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: decryptIntegrationSecret(connection.password) || "",
      mailbox: connection.mailbox || "INBOX",
      useTls: connection.useTls ?? true,
      enabled: connection.enabled ?? true,
    });

    if (items.length) {
      await db
        .insert(externalIntegrationItems)
        .values(
          items.map((item) => ({
            companyId,
            source: "mail" as const,
            kind: "email" as const,
            externalId: item.externalId,
            title: item.title,
            summary: item.fromEmail
              ? `From ${item.fromName || item.fromEmail} <${item.fromEmail}>`
              : undefined,
            fromName: item.fromName,
            fromEmail: item.fromEmail,
            occurredAt: item.occurredAt,
            raw: item.raw,
          })),
        )
        .onConflictDoNothing();
    }

    await saveCompanySettings(companyId, {
      ...settings,
      mailIntake: {
        ...connection,
        lastTestedAt: new Date().toISOString(),
        lastStatus: "ok",
        lastError: undefined,
      },
    });
    revalidatePath("/settings/integrations");
    return { success: true, data: { imported: items.length } };
  } catch (error) {
    return { success: false, error: sanitizeIntegrationError(error) };
  }
}

export const ignoreExternalIntegrationItemAction = createAction<string, void>({
  handler: async (id, { companyId, db }) => {
    await db
      .update(externalIntegrationItems)
      .set({ status: "ignored", updatedAt: new Date() })
      .where(
        and(
          eq(externalIntegrationItems.id, id),
          eq(externalIntegrationItems.companyId, companyId),
        ),
      );
  },
  revalidate: ["/settings/integrations"],
  errorMessage: "Integration item could not be ignored",
  minRole: "member",
});

export const createContactFromIntegrationItemAction = createAction<
  string,
  { contactId: string }
>({
  handler: async (id, { companyId, db }) => {
    const [item] = await db
      .select()
      .from(externalIntegrationItems)
      .where(
        and(
          eq(externalIntegrationItems.id, id),
          eq(externalIntegrationItems.companyId, companyId),
        ),
      );

    if (!item) throw new Error("Integration item not found");
    if (!item.fromEmail) throw new Error("Integration item has no email");

    const [existing] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.companyId, companyId),
          eq(contacts.email, item.fromEmail),
        ),
      )
      .limit(1);

    const contactId =
      existing?.id ||
      (
        await createContact(db, companyId, {
          type: "customer",
          name: item.fromName || item.fromEmail,
          email: item.fromEmail,
          notes: `Created from ${item.source} item: ${item.title}`,
        })
      ).id;

    await db
      .update(externalIntegrationItems)
      .set({ status: "converted", contactId, updatedAt: new Date() })
      .where(eq(externalIntegrationItems.id, item.id));

    revalidatePath("/contacts");
    return { contactId };
  },
  revalidate: ["/settings/integrations"],
  errorMessage: "Contact could not be created from integration item",
  minRole: "member",
});

export async function testRicardoConnectionAction(): Promise<
  ActionResult<void>
> {
  const t = await getTranslations("ricardo");
  try {
    const { companyId } = await requireRole("admin");

    const [row] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (row?.settings as CompanySettings)?.ricardoApiKey;
    if (!apiKey) {
      return { success: false, error: t("errorNoApiKey") };
    }

    const result = await testConnection(apiKey);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("publishError")),
    };
  }
}

// ============================================================================
// PUBLISH / UNPUBLISH
// ============================================================================

export async function publishToRicardoAction(
  itemId: string,
): Promise<ActionResult<{ listingUrl: string }>> {
  const t = await getTranslations("ricardo");
  try {
    const { companyId } = await requireRole("member");

    // Fetch company API key
    const [companyRow] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (companyRow?.settings as CompanySettings)?.ricardoApiKey;
    if (!apiKey) {
      return { success: false, error: t("errorNoApiKeySetup") };
    }

    // Fetch item — only sellable items can be listed
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.companyId, companyId),
        ),
      );

    if (!item) return { success: false, error: t("errorItemNotFound") };

    if (!(PUBLIC_ITEM_STATUSES as readonly string[]).includes(item.status)) {
      return { success: false, error: t("errorStatusInvalid") };
    }

    if (!item.askingPrice || new Decimal(item.askingPrice).lte(0)) {
      return { success: false, error: t("errorNeedsPrice") };
    }

    // Build payload and publish
    const payload = buildRicardoListingPayload({
      itemNumber: item.itemNumber,
      description: item.description,
      condition: item.condition,
      askingPrice: item.askingPrice,
      photoBase64: item.photoBase64,
      category: item.category,
      notes: item.notes,
    });

    const { listingId, listingUrl } = await publishListing(apiKey, payload);

    // Store result on item
    await db
      .update(inventoryItems)
      .set({
        externalListingId: listingId,
        externalListingUrl: listingUrl,
        externalListingStatus: "active",
        status: "listed",
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true, data: { listingUrl } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("publishError")),
    };
  }
}

export async function unpublishFromRicardoAction(
  itemId: string,
): Promise<ActionResult<void>> {
  const t = await getTranslations("ricardo");
  try {
    const { companyId } = await requireRole("member");

    const [companyRow] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (companyRow?.settings as CompanySettings)?.ricardoApiKey;

    const [item] = await db
      .select({
        externalListingId: inventoryItems.externalListingId,
        companyId: inventoryItems.companyId,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.companyId, companyId),
        ),
      );

    if (!item) return { success: false, error: t("errorItemNotFound") };

    if (apiKey && item.externalListingId) {
      try {
        await deleteListing(apiKey, item.externalListingId);
      } catch {
        // Best-effort — continue to clear local state even if API call fails
      }
    }

    await db
      .update(inventoryItems)
      .set({
        externalListingStatus: "removed",
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("unpublishError")),
    };
  }
}
