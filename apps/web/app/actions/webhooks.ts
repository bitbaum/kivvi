"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";

type WebhookT = Awaited<
  ReturnType<typeof getTranslations<"settings.webhooks">>
>;

function makeEndpointSchema(t: WebhookT) {
  return z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(t("errorInvalidUrl")),
    secret: z.string().min(16, t("errorSecretTooShort")),
    events: z
      .array(z.enum(WEBHOOK_EVENT_VALUES))
      .min(1, t("errorNoEventsSelected")),
  });
}

export async function listWebhookEndpointsAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listWebhookEndpoints>>>
> {
  try {
    const { companyId } = await requireRole("admin");
    const endpoints = await listWebhookEndpoints(db, companyId);
    return { success: true, data: endpoints };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to list webhook endpoints"),
    };
  }
}

export async function createWebhookEndpointAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("settings.webhooks");
  try {
    const { companyId } = await requireRole("admin");
    const parsed = makeEndpointSchema(t).safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || t("errorInvalidInput"),
      };
    }

    const endpoint = await createWebhookEndpoint(db, companyId, {
      name: parsed.data.name,
      url: parsed.data.url,
      secret: parsed.data.secret,
      events: parsed.data.events as WebhookEvent[],
    });

    revalidatePath("/settings/webhooks");
    return { success: true, data: { id: endpoint.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("createError")),
    };
  }
}

export async function updateWebhookEndpointAction(
  endpointId: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const t = await getTranslations("settings.webhooks");
  try {
    const { companyId } = await requireRole("admin");
    const parsed = makeEndpointSchema(t).partial().safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || t("errorInvalidInput"),
      };
    }

    await updateWebhookEndpoint(db, companyId, endpointId, {
      ...parsed.data,
      events: parsed.data.events as WebhookEvent[] | undefined,
    });

    revalidatePath("/settings/webhooks");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update webhook endpoint"),
    };
  }
}

export async function toggleWebhookEndpointAction(
  endpointId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");
    await updateWebhookEndpoint(db, companyId, endpointId, { isActive });
    revalidatePath("/settings/webhooks");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to toggle webhook endpoint"),
    };
  }
}

export async function deleteWebhookEndpointAction(
  endpointId: string,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");
    await deleteWebhookEndpoint(db, companyId, endpointId);
    revalidatePath("/settings/webhooks");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete webhook endpoint"),
    };
  }
}

export async function listWebhookDeliveriesAction(
  endpointId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof listWebhookDeliveries>>>> {
  try {
    const { companyId } = await requireRole("admin");
    const deliveries = await listWebhookDeliveries(db, companyId, endpointId);
    return { success: true, data: deliveries };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to load deliveries"),
    };
  }
}
