"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
} from "@kivvi/core/src/domain/webhooks";
import { WEBHOOK_EVENT_VALUES } from "@kivvi/database";
import type { WebhookEvent } from "@kivvi/database";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";

const endpointSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url("Ungültige URL"),
  secret: z.string().min(16, "Secret muss mindestens 16 Zeichen lang sein"),
  events: z
    .array(z.enum(WEBHOOK_EVENT_VALUES))
    .min(1, "Mindestens ein Event auswählen"),
});

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
  try {
    const { companyId } = await requireRole("admin");
    const parsed = endpointSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Ungültige Eingabe",
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
      error: safeErrorMessage(error, "Failed to create webhook endpoint"),
    };
  }
}

export async function updateWebhookEndpointAction(
  endpointId: string,
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");
    const parsed = endpointSchema.partial().safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Ungültige Eingabe",
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
