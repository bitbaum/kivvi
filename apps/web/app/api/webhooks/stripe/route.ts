import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    logger.error(`Webhook handler error for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  if (!companyId) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  await updateCompanyBilling(companyId, {
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: subscriptionId ?? undefined,
    subscriptionStatus: "active",
    plan: "premium",
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const companyId = await findCompanyByCustomerId(
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
  );
  if (!companyId) return;

  const statusMap: Record<string, CompanySettings["subscriptionStatus"]> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
  };

  const status = statusMap[subscription.status] ?? "active";
  const plan =
    subscription.status === "active" || subscription.status === "trialing"
      ? ("premium" as const)
      : undefined;

  await updateCompanyBilling(companyId, {
    subscriptionStatus: status,
    ...(plan && { plan }),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const companyId = await findCompanyByCustomerId(
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
  );
  if (!companyId) return;

  await updateCompanyBilling(companyId, {
    subscriptionStatus: "cancelled",
    plan: "free",
    stripeSubscriptionId: undefined,
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const companyId = await findCompanyByCustomerId(customerId);
  if (!companyId) return;

  await updateCompanyBilling(companyId, {
    subscriptionStatus: "past_due",
  });
}

// ── Helpers ──

async function findCompanyByCustomerId(stripeCustomerId: string): Promise<string | null> {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(sql`${companies.settings}->>'stripeCustomerId' = ${stripeCustomerId}`)
    .limit(1);
  return company?.id ?? null;
}

async function updateCompanyBilling(companyId: string, updates: Partial<CompanySettings>) {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  if (!company) return;

  const existing = (company.settings as CompanySettings) || {};

  await db
    .update(companies)
    .set({
      settings: { ...existing, ...updates },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}
