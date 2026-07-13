"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeErrorMessage, type ActionResult } from "./utils";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";
import {
  createJoinRequest,
  createInvitationForAcceptedRequest,
  createVacancy,
  joinRequestSchema,
  organizationProfileSchema,
  transitionJoinRequestStatus,
  transitionVacancyStatus,
  upsertOrganizationProfile,
  vacancySchema,
} from "@kivvi/core/src/domain/participation";
import type { OrganizationProfile, Vacancy } from "@kivvi/database";
import type {
  JoinRequestStatusValue,
  VacancyStatusValue,
} from "@kivvi/database/src/enums";

export const saveOrganizationProfileAction = createAction<
  unknown,
  OrganizationProfile
>({
  minRole: "admin",
  handler: async (input, { companyId, db }) => {
    const parsed = organizationProfileSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    }
    return upsertOrganizationProfile(db, companyId, parsed.data);
  },
  revalidate: ["/settings/company", "/orgs"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("organizationProfile.saveError")),
});

export const createVacancyAction = createAction<unknown, Vacancy>({
  minRole: "admin",
  handler: async (input, { companyId, db }) => {
    const parsed = vacancySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    }
    return createVacancy(db, companyId, parsed.data);
  },
  revalidate: ["/settings/company", "/orgs"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("vacancies.saveError")),
});

export const updateVacancyStatusAction = createAction<
  { vacancyId: unknown; status: unknown },
  Vacancy
>({
  minRole: "admin",
  handler: async ({ vacancyId, status }, { companyId, db }) => {
    const parsed = z
      .object({
        vacancyId: z.string().uuid(),
        status: z.enum(["draft", "published", "closed"]),
      })
      .safeParse({ vacancyId, status });
    if (!parsed.success) throw new Error("Invalid vacancy status");
    return transitionVacancyStatus(
      db,
      companyId,
      parsed.data.vacancyId,
      parsed.data.status as VacancyStatusValue,
    );
  },
  revalidate: ["/settings/company", "/orgs"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("vacancies.statusError")),
  translateDomainErrors: true,
});

export async function createJoinRequestAction(
  input: unknown,
): Promise<ActionResult> {
  const t = await getTranslations("orgs");
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const parsed = joinRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    }
    await createJoinRequest(db, session.user.id, parsed.data);
    revalidatePath("/join");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("applyError")),
    };
  }
}

export const updateJoinRequestStatusAction = createAction<
  { requestId: unknown; status: unknown },
  unknown
>({
  minRole: "admin",
  handler: async ({ requestId, status }, { companyId, db }) => {
    const parsed = z
      .object({
        requestId: z.string().uuid(),
        status: z.enum(["pending", "accepted", "declined", "withdrawn"]),
      })
      .safeParse({ requestId, status });
    if (!parsed.success) throw new Error("Invalid join request status");
    return transitionJoinRequestStatus(
      db,
      companyId,
      parsed.data.requestId,
      parsed.data.status as JoinRequestStatusValue,
    );
  },
  revalidate: ["/settings/company"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("joinRequests.statusError")),
  translateDomainErrors: true,
});

export const acceptJoinRequestAction = createAction<
  { requestId: unknown },
  { inviteUrl: string }
>({
  minRole: "admin",
  handler: async ({ requestId }, { companyId, userId, db }) => {
    const parsed = z.string().uuid().safeParse(requestId);
    if (!parsed.success) throw new Error("Invalid join request");
    const invitation = await createInvitationForAcceptedRequest(
      db,
      companyId,
      parsed.data,
      userId,
    );
    const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";
    return { inviteUrl: `${baseUrl}/invite/${invitation.token}` };
  },
  revalidate: ["/settings/company"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("joinRequests.acceptError")),
  translateDomainErrors: true,
});
