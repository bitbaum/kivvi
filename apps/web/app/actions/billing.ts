"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getSession, requireRole, type ActionResult } from "./utils";
import { getTranslations } from "next-intl/server";
import { logger } from "@/lib/logger";

/**
 * Create a Stripe Checkout session for upgrading to premium.
 * Returns the checkout URL for client-side redirect.
 */
export async function createCheckoutSessionAction(): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations("settings.billing");
  try {
    const { companyId } = await requireRole("owner");

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));

    if (!company) {
      return { success: false, error: t("errorCompanyNotFound") };
    }

    const settings = (company.settings as CompanySettings) || {};

    // Reuse existing Stripe customer or create new one
    let customerId = settings.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { companyId },
        name: company.name,
      });
      customerId = customer.id;

      // Save Stripe customer ID immediately
      await db
        .update(companies)
        .set({
          settings: { ...settings, stripeCustomerId: customerId },
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return { success: false, error: t("errorStripePriceNotConfigured") };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings/billing?cancelled=true`,
      metadata: { companyId },
    });

    if (!session.url) {
      return { success: false, error: t("errorCheckoutSession") };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    logger.error("Checkout session error", error);
    return { success: false, error: t("errorCheckoutSession") };
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 * Returns the portal URL for client-side redirect.
 */
export async function createPortalSessionAction(): Promise<ActionResult<{ url: string }>> {
  const t = await getTranslations("settings.billing");
  try {
    const { companyId } = await requireRole("owner");

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));

    if (!company) {
      return { success: false, error: t("errorCompanyNotFound") };
    }

    const settings = (company.settings as CompanySettings) || {};

    if (!settings.stripeCustomerId) {
      return { success: false, error: t("errorNoBillingAccount") };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: settings.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    logger.error("Portal session error", error);
    return { success: false, error: t("errorBillingPortal") };
  }
}
