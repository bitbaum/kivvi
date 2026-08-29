"use server";

import { z } from "zod";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  listWebhookDeliveries,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
} from "@kivvi/core/src/domain/webhooks";
import { WEBHOOK_EVENT_VALUES } from "@kivvi/database";
import type { WebhookEvent } from "@kivvi/database";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

async function getEndpointSchema() {
  const t = await getTranslations("settings.webhooks");
  return z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(t("errorInvalidUrl")),
    secret: z.string().min(16, t("errorSecretTooShort")),
    events: z.array(z.enum(WEBHOOK_EVENT_VALUES)).min(1, t("errorNoEventsSelected")),
  });
}

export const listWebhookEndpointsAction = createAction<
  void,
  Awaited<ReturnType<typeof listWebhookEndpoints>>
>({
  handler: async (_input, { companyId, db }) => listWebhookEndpoints(db, companyId),
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("listError")),
  minRole: "admin",
});

export const createWebhookEndpointAction = createAction<unknown, { id: string }>({
  handler: async (input, { companyId, db }) => {
    const t = await getTranslations("settings.webhooks");
    const parsed = (await getEndpointSchema()).safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || t("errorInvalidInput"));
    const endpoint = await createWebhookEndpoint(db, companyId, {
      name: parsed.data.name,
      url: parsed.data.url,
      secret: parsed.data.secret,
      events: parsed.data.events as WebhookEvent[],
    });
    return { id: endpoint.id };
  },
  revalidate: ["/settings/webhooks"],
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("createError")),
  minRole: "admin",
});

export const updateWebhookEndpointAction = createAction<
  { endpointId: string; input: unknown },
  void
>({
  handler: async ({ endpointId, input }, { companyId, db }) => {
    const t = await getTranslations("settings.webhooks");
    const parsed = (await getEndpointSchema()).partial().safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.errors[0]?.message || t("errorInvalidInput"));
    await updateWebhookEndpoint(db, companyId, endpointId, {
      ...parsed.data,
      events: parsed.data.events as WebhookEvent[] | undefined,
    });
  },
  revalidate: ["/settings/webhooks"],
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("updateError")),
  minRole: "admin",
});

export const toggleWebhookEndpointAction = createAction<
  { endpointId: string; isActive: boolean },
  void
>({
  handler: async ({ endpointId, isActive }, { companyId, db }) => {
    await updateWebhookEndpoint(db, companyId, endpointId, { isActive });
  },
  revalidate: ["/settings/webhooks"],
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("toggleError")),
  minRole: "admin",
});

export const deleteWebhookEndpointAction = createAction<string, void>({
  handler: async (endpointId, { companyId, db }) => {
    await deleteWebhookEndpoint(db, companyId, endpointId);
  },
  revalidate: ["/settings/webhooks"],
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("deleteError")),
  minRole: "admin",
});

export const listWebhookDeliveriesAction = createAction<
  string,
  Awaited<ReturnType<typeof listWebhookDeliveries>>
>({
  handler: async (endpointId, { companyId, db }) =>
    listWebhookDeliveries(db, companyId, endpointId),
  errorMessage: () => getTranslations("settings.webhooks").then((t) => t("deliveriesError")),
  minRole: "admin",
});
