import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  Receipt,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getContact } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import {
  CONTACT_TYPE_STYLES,
  getContactTypeLabels,
} from "@/lib/config/contact-types";
import { Breadcrumb } from "@/components/breadcrumb";
import { CardSection } from "@/components/card-section";
import { InfoRow } from "@/components/info-display";
import { StatusBadge } from "@/components/status-badge";
import { DeleteContactButton } from "./delete-button";
import { AddressManager } from "./address-manager";
import {
  QuickActionsBar,
  type QuickAction,
} from "@/components/quick-actions-bar";
import { ContactDetailSidebar } from "./contact-detail-sidebar";
import { ContactRecentDocuments } from "./contact-recent-documents";

interface ContactDetailPageProps {
  params: { id: string };
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const session = await getSessionOrRedirect();

  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");

  if (!isValidUUID(params.id)) notFound();
  const data = await getContact(db, session.user.companyId, params.id);
  if (!data) {
    notFound();
  }

  const { contact, addresses, recentDocuments } = data;

  const TYPE_LABELS = getContactTypeLabels(t);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: tc("dashboard"), href: "/dashboard" },
          { label: t("title"), href: "/contacts" },
          { label: contact.name },
        ]}
      />
      {/* Back + Header */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")} {t("title")}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contact.name}</h1>
              <StatusBadge
                status={contact.type}
                label={TYPE_LABELS[contact.type] || contact.type}
                styleMap={CONTACT_TYPE_STYLES}
              />
              <StatusBadge
                variant={contact.isActive ? "active" : "inactive"}
                label={contact.isActive ? tc("active") : tc("inactive")}
              />
            </div>
            {contact.contactNumber && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {contact.contactNumber}
              </p>
            )}
            {(contact.firstName || contact.lastName) && (
              <p className="text-muted-foreground">
                {[contact.firstName, contact.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${contact.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
              {tc("edit")}
            </Link>
            <DeleteContactButton
              contactId={contact.id}
              contactName={contact.name}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsBar actions={buildContactQuickActions(contact, t)} />

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Contact details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <CardSection title={t("contactInformation")}>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label={tc("email")}
                value={contact.email}
                copyable
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label={tc("phone")}
                value={contact.phone}
                copyable
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label={t("mobile")}
                value={contact.mobile}
                copyable
              />
              <InfoRow
                icon={<Globe className="h-4 w-4" />}
                label={t("website")}
                value={contact.website}
              />
            </div>
          </CardSection>

          {/* Address */}
          <CardSection
            title={t("primaryAddress")}
            icon={<MapPin className="h-4 w-4" />}
          >
            {contact.address || contact.city || contact.postalCode ? (
              <div className="text-sm space-y-1">
                {contact.address && <p>{contact.address}</p>}
                {(contact.postalCode || contact.city) && (
                  <p>
                    {contact.postalCode} {contact.city}
                  </p>
                )}
                {contact.country && <p>{contact.country}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tc("notSet")}</p>
            )}
          </CardSection>

          {/* Addresses */}
          <AddressManager contactId={contact.id} addresses={addresses} />

          {/* Recent Documents */}
          <ContactRecentDocuments
            contactId={contact.id}
            documents={recentDocuments}
          />
        </div>

        {/* Right column: Financial & settings */}
        <ContactDetailSidebar contact={contact} />
      </div>
    </div>
  );
}

function buildContactQuickActions(
  contact: { id: string; name: string; type: string; email: string | null },
  t: (key: string) => string,
): QuickAction[] {
  const actions: QuickAction[] = [];
  const params = `contactId=${contact.id}&contactName=${encodeURIComponent(contact.name)}`;

  if (contact.type === "customer" || contact.type === "both") {
    actions.push(
      {
        label: t("createQuote"),
        href: `/sales/quotes/new?${params}`,
        icon: <Receipt className="h-4 w-4" />,
        variant: "primary",
      },
      {
        label: t("createInvoice"),
        href: `/sales/invoices/new?${params}`,
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: t("createOrder"),
        href: `/sales/orders/new?${params}`,
        icon: <ShoppingCart className="h-4 w-4" />,
      },
    );
  }
  if (contact.type === "vendor" || contact.type === "both") {
    actions.push(
      {
        label: t("createPurchaseOrder"),
        href: `/purchasing/purchase-orders/new?${params}`,
        icon: <Truck className="h-4 w-4" />,
        variant: contact.type === "vendor" ? "primary" : undefined,
      },
      {
        label: t("createPurchaseInvoice"),
        href: `/purchasing/purchase-invoices/new?${params}`,
        icon: <FileText className="h-4 w-4" />,
      },
    );
  }
  if (contact.email) {
    actions.push({
      label: t("sendEmail"),
      href: `mailto:${contact.email}`,
      icon: <Mail className="h-4 w-4" />,
    });
  }

  return actions;
}
