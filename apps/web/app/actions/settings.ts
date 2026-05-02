"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { companies, users, numberSequences } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { AI_PROVIDER_VALUES } from "@kivvi/database/src/enums";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/config/uploads";

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

const updateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().max(200).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().default("CH"),
  currency: z.string().max(3).optional().default(DEFAULT_CURRENCY),
  // Settings JSONB fields
  iban: z.string().max(34).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
  defaultVatRate: z
    .string()
    .refine((v) => !v || !isNaN(Number(v)), "Must be a valid number")
    .optional()
    .nullable(),
  defaultPaymentTermsDays: z
    .string()
    .refine((v) => !v || !isNaN(Number(v)), "Must be a valid number")
    .optional()
    .nullable(),
  defaultDocumentFooter: z.string().max(1000).optional().nullable(),
  aiProvider: z.enum(AI_PROVIDER_VALUES).optional().nullable(),
  aiModel: z.string().max(100).optional().nullable(),
  aiApiKey: z.string().max(200).optional().nullable(),
});

export const updateCompanyAction = createAction<unknown, unknown>({
  handler: async (input, { companyId, db }) => {
    const parsed = updateCompanySchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");

    // Read existing settings to merge (preserve AI config, plan, etc.)
    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const existingSettings = (existing?.settings as CompanySettings) ?? {};

    // Merge new values into settings JSONB
    const updatedSettings: CompanySettings = {
      ...existingSettings,
      bankAccount: {
        ...existingSettings.bankAccount,
        iban: parsed.data.iban || existingSettings.bankAccount?.iban,
        bankName:
          parsed.data.bankName || existingSettings.bankAccount?.bankName,
      },
      defaultVatRate: parsed.data.defaultVatRate
        ? Number(parsed.data.defaultVatRate)
        : existingSettings.defaultVatRate,
      defaultPaymentTermsDays: parsed.data.defaultPaymentTermsDays
        ? parseInt(parsed.data.defaultPaymentTermsDays, 10)
        : existingSettings.defaultPaymentTermsDays,
      defaultDocumentFooter:
        parsed.data.defaultDocumentFooter ??
        existingSettings.defaultDocumentFooter,
      aiProvider: parsed.data.aiProvider || existingSettings.aiProvider,
      aiModel: parsed.data.aiModel || existingSettings.aiModel,
      // Only update API key if not the mask placeholder
      ...(parsed.data.aiApiKey && parsed.data.aiApiKey !== "********"
        ? { aiApiKey: parsed.data.aiApiKey }
        : {}),
    };

    const [company] = await db
      .update(companies)
      .set({
        name: parsed.data.name,
        legalName: parsed.data.legalName || null,
        vatNumber: parsed.data.vatNumber || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        postalCode: parsed.data.postalCode || null,
        country: parsed.data.country,
        currency: parsed.data.currency,
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    return company;
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("errorUpdateCompany")),
  minRole: "admin",
});

// ============================================================================
// COMPANY SHOP SLUG
// ============================================================================

export async function updateCompanySlugAction(
  slug: string | null,
): Promise<ActionResult<{ slug: string | null }>> {
  const t = await getTranslations("settings");
  try {
    const { companyId } = await requireRole("admin");

    // Sanitize: lowercase, alphanumeric + hyphens, max 80 chars
    const cleanSlug = slug
      ? slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80)
      : null;

    const [updated] = await db
      .update(companies)
      .set({ slug: cleanSlug, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning({ slug: companies.slug });

    revalidatePath("/settings/company");
    return { success: true, data: { slug: updated?.slug ?? null } };
  } catch (error) {
    // Unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return {
        success: false,
        error: "Dieser Shop-Name ist bereits vergeben.",
      };
    }
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSaveShopUrl")),
    };
  }
}

// ============================================================================
// COMPANY LOGO
// ============================================================================

const MAX_IMAGE_SIZE = MAX_UPLOAD_SIZE_BYTES;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export async function uploadLogoAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("settings");
  try {
    const { companyId } = await requireRole("admin");

    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: t("errorNoFileProvided") };
    }

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Use PNG, JPEG, or SVG.",
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return { success: false, error: t("errorFileTooLarge") };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const existingSettings = (existing?.settings as CompanySettings) ?? {};

    await db
      .update(companies)
      .set({
        settings: {
          ...existingSettings,
          logoBase64: base64,
          logoMimeType: file.type,
        },
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorUploadLogo")),
    };
  }
}

export const removeLogoAction = createAction<void, void>({
  handler: async (_input, { companyId, db }) => {
    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const existingSettings = (existing?.settings as CompanySettings) ?? {};
    const { logoBase64: _, logoMimeType: __, ...rest } = existingSettings;

    await db
      .update(companies)
      .set({ settings: rest, updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("errorRemoveLogo")),
  minRole: "admin",
});

// ============================================================================
// USER PROFILE
// ============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
});

export const updateProfileAction = createAction<
  unknown,
  { id: string; name: string | null; email: string }
>({
  handler: async (input, { userId, db }) => {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const [user] = await db
      .update(users)
      .set({
        name: parsed.data.name,
        email: parsed.data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return { id: user.id, name: user.name, email: user.email };
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("errorUpdateProfile")),
});

// ============================================================================
// CHANGE PASSWORD
// ============================================================================

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const t = await getTranslations("settings.profile");
  try {
    const { userId } = await getSession();
    const schema = z
      .object({
        currentPassword: z.string().min(1, t("currentPasswordRequired")),
        newPassword: z.string().min(8, t("passwordMinLength")),
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: t("passwordMismatch"),
        path: ["confirmPassword"],
      });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      };
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));

    if (!user?.passwordHash) throw new Error("Invalid account state");

    const isValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      return { success: false, error: t("currentPasswordIncorrect") };
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorChangePasswordFailed")),
    };
  }
}

// ============================================================================
// USER AVATAR
// ============================================================================

export async function getUserAvatarAction(): Promise<string | null> {
  try {
    const { userId } = await getSession();
    const [user] = await db
      .select({ avatarBase64: users.avatarBase64 })
      .from(users)
      .where(eq(users.id, userId));
    return user?.avatarBase64 ?? null;
  } catch {
    return null;
  }
}

const MAX_AVATAR_SIZE = MAX_IMAGE_SIZE;
const ALLOWED_AVATAR_TYPES = ALLOWED_LOGO_TYPES;

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("settings");
  try {
    const { userId } = await getSession();

    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: t("errorNoFileProvided") };
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Use PNG, JPEG, or SVG.",
      };
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return { success: false, error: t("errorFileTooLarge") };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    await db
      .update(users)
      .set({ avatarBase64: base64, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorUploadAvatar")),
    };
  }
}

export const removeAvatarAction = createAction<void, void>({
  handler: async (_input, { userId, db }) => {
    await db
      .update(users)
      .set({ avatarBase64: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("errorRemoveAvatar")),
});

// ============================================================================
// NUMBER SEQUENCES
// ============================================================================

const updateSequenceSchema = z.object({
  prefix: z.string().min(1).max(10),
  nextNumber: z.number().int().min(1),
  format: z.string().min(1).max(100),
});

export const updateNumberSequenceAction = createAction<
  { sequenceId: string; input: unknown },
  unknown
>({
  handler: async ({ sequenceId, input }, { companyId, db }) => {
    const parsed = updateSequenceSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(parsed.error.errors[0]?.message || "Invalid input");
    const [seq] = await db
      .update(numberSequences)
      .set({
        prefix: parsed.data.prefix,
        nextNumber: parsed.data.nextNumber,
        format: parsed.data.format,
      })
      .where(
        and(
          eq(numberSequences.id, sequenceId),
          eq(numberSequences.companyId, companyId),
        ),
      )
      .returning();
    if (!seq) throw new Error("Sequence not found");
    return seq;
  },
  revalidate: ["/settings"],
  errorMessage: () =>
    getTranslations("settings").then((t) => t("errorUpdateSequence")),
  minRole: "admin",
});

// ============================================================================
// CO2 IMPACT FACTORS
// ============================================================================

export async function updateCo2FactorsAction(
  factors: Record<string, number>,
): Promise<ActionResult<void>> {
  const t = await getTranslations("settings");
  try {
    const { companyId } = await requireRole("admin");

    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const existingSettings = (existing?.settings as CompanySettings) ?? {};

    await db
      .update(companies)
      .set({
        settings: { ...existingSettings, co2FactorsKg: factors },
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    revalidatePath("/settings");
    revalidatePath("/reports/impact");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorUpdateCo2Factors")),
    };
  }
}
