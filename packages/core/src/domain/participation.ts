import { and, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  companies,
  invitations,
  joinRequests,
  organizationProfiles,
  users,
  vacancies,
  JOIN_REQUEST_STATUS_VALUES,
  LOCATION_MODE_VALUES,
  VACANCY_STATUS_VALUES,
  VACANCY_TYPE_VALUES,
  type Database,
  type JoinRequestStatus,
  type LocationMode,
  type VacancyStatus,
  type VacancyType,
} from "@kivvi/database";
import { DomainError } from "../domain-error";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const organizationProfileSchema = z.object({
  publicSlug: slugSchema,
  publicName: z.string().trim().min(2).max(200),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  website: z.string().url().max(300).optional().nullable(),
  logoBase64: z.string().optional().nullable(),
  isPublic: z.boolean().default(false),
  acceptingApplications: z.boolean().default(false),
});

const skillsSchema = z.array(z.string().trim().min(1).max(60)).max(20);

export const vacancySchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(VACANCY_TYPE_VALUES),
  locationMode: z.enum(LOCATION_MODE_VALUES),
  workload: z.string().trim().max(80).optional().nullable(),
  skills: skillsSchema.default([]),
  status: z.enum(VACANCY_STATUS_VALUES).default("draft"),
});

export const joinRequestSchema = z.object({
  companyId: z.string().uuid(),
  vacancyId: z.string().uuid().optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function upsertOrganizationProfile(
  db: Database,
  companyId: string,
  input: z.infer<typeof organizationProfileSchema>,
) {
  const parsed = organizationProfileSchema.parse(input);
  const [existing] = await db
    .select({ id: organizationProfiles.id })
    .from(organizationProfiles)
    .where(eq(organizationProfiles.companyId, companyId));

  const values = {
    companyId,
    publicSlug: parsed.publicSlug,
    publicName: parsed.publicName,
    shortDescription: parsed.shortDescription || null,
    category: parsed.category || null,
    location: parsed.location || null,
    website: parsed.website || null,
    logoBase64: parsed.logoBase64 || null,
    isPublic: parsed.isPublic,
    acceptingApplications: parsed.acceptingApplications,
    updatedAt: new Date(),
  };

  if (existing) {
    const [profile] = await db
      .update(organizationProfiles)
      .set(values)
      .where(eq(organizationProfiles.id, existing.id))
      .returning();
    return profile;
  }

  const [profile] = await db.insert(organizationProfiles).values(values).returning();
  return profile;
}

export async function getPublicOrganizationProfile(db: Database, publicSlug: string) {
  return db.query.organizationProfiles.findFirst({
    where: and(
      eq(organizationProfiles.publicSlug, publicSlug),
      eq(organizationProfiles.isPublic, true),
    ),
    with: { company: true },
  });
}

export async function listPublicOrganizationProfiles(db: Database) {
  return db.query.organizationProfiles.findMany({
    where: eq(organizationProfiles.isPublic, true),
    with: { company: true },
  });
}

export async function createVacancy(
  db: Database,
  companyId: string,
  input: z.infer<typeof vacancySchema>,
) {
  const parsed = vacancySchema.parse(input);
  const [vacancy] = await db
    .insert(vacancies)
    .values({
      companyId,
      title: parsed.title,
      type: parsed.type as VacancyType,
      locationMode: parsed.locationMode as LocationMode,
      workload: parsed.workload || null,
      skills: parsed.skills,
      status: parsed.status as VacancyStatus,
    })
    .returning();
  return vacancy;
}

export async function transitionVacancyStatus(
  db: Database,
  companyId: string,
  vacancyId: string,
  status: VacancyStatus,
) {
  if (!["draft", "published", "closed"].includes(status)) {
    throw new DomainError("invalidVacancyStatus");
  }

  const [vacancy] = await db
    .update(vacancies)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(vacancies.id, vacancyId), eq(vacancies.companyId, companyId)))
    .returning();

  if (!vacancy) throw new DomainError("vacancyNotFound");
  return vacancy;
}

export async function createJoinRequest(
  db: Database,
  userId: string,
  input: z.infer<typeof joinRequestSchema>,
) {
  const parsed = joinRequestSchema.parse(input);
  const profile = await db.query.organizationProfiles.findFirst({
    where: and(
      eq(organizationProfiles.companyId, parsed.companyId),
      eq(organizationProfiles.isPublic, true),
      eq(organizationProfiles.acceptingApplications, true),
    ),
  });
  if (!profile) throw new DomainError("organizationNotAcceptingApplications");

  if (parsed.vacancyId) {
    const vacancy = await db.query.vacancies.findFirst({
      where: and(
        eq(vacancies.id, parsed.vacancyId),
        eq(vacancies.companyId, parsed.companyId),
        eq(vacancies.status, "published"),
      ),
    });
    if (!vacancy) throw new DomainError("vacancyNotFound");
  }

  const existing = await db.query.joinRequests.findFirst({
    where: and(
      eq(joinRequests.userId, userId),
      eq(joinRequests.companyId, parsed.companyId),
      eq(joinRequests.status, "pending"),
    ),
  });
  if (existing) throw new DomainError("joinRequestAlreadyPending");

  const [request] = await db
    .insert(joinRequests)
    .values({
      userId,
      companyId: parsed.companyId,
      vacancyId: parsed.vacancyId || null,
      message: parsed.message || null,
    })
    .returning();
  return request;
}

export async function transitionJoinRequestStatus(
  db: Database,
  companyId: string,
  requestId: string,
  status: JoinRequestStatus,
) {
  if (!JOIN_REQUEST_STATUS_VALUES.includes(status)) {
    throw new DomainError("invalidJoinRequestStatus");
  }

  const [request] = await db
    .update(joinRequests)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(joinRequests.id, requestId), eq(joinRequests.companyId, companyId)))
    .returning();
  if (!request) throw new DomainError("joinRequestNotFound");
  return request;
}

export async function createInvitationForAcceptedRequest(
  db: Database,
  companyId: string,
  requestId: string,
  invitedBy: string,
) {
  const request = await db.query.joinRequests.findFirst({
    where: and(eq(joinRequests.id, requestId), eq(joinRequests.companyId, companyId)),
  });
  if (!request) throw new DomainError("joinRequestNotFound");

  const user = await db.query.users.findFirst({
    where: eq(users.id, request.userId),
  });
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
  if (!user || !company) throw new DomainError("joinRequestNotFound");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invitation] = await db
    .insert(invitations)
    .values({
      companyId,
      email: user.email.toLowerCase(),
      role: "member",
      permissionPreset: "sales",
      invitedBy,
      token,
      expiresAt,
    })
    .returning();

  await transitionJoinRequestStatus(db, companyId, requestId, "accepted");
  return invitation;
}
