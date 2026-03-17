import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  MapPinned,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getContact } from "@kivvi/core";
import { cn, formatCurrency, formatDate, isValidUUID } from "@/lib/utils";
import { STATUS_STYLES, toCamelCase } from "@/lib/config/document-types";
import {
  CONTACT_TYPE_STYLES,
  getContactTypeLabels,
} from "@/lib/config/contact-types";
import { Breadcrumb } from "@/components/breadcrumb";
import { DeleteContactButton } from "./delete-button";
import { AddressManager } from "./address-manager";

interface ContactDetailPageProps {
  params: { id: string };
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");
  const td = await getTranslations("documents");
  const ts = await getTranslations("status");

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
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("back")} {t("title")}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contact.name}</h1>
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                  CONTACT_TYPE_STYLES[
                    contact.type as keyof typeof CONTACT_TYPE_STYLES
                  ] || "",
                )}
              >
                {TYPE_LABELS[contact.type] || contact.type}
              </span>
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                  contact.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
                )}
              >
                {contact.isActive ? tc("active") : tc("inactive")}
              </span>
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

      {/* Content tabs using simple sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Contact details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{t("contactInformation")}</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label={tc("email")}
                value={contact.email}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label={tc("phone")}
                value={contact.phone}
              />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label={t("mobile")}
                value={contact.mobile}
              />
              <InfoRow
                icon={<Globe className="h-4 w-4" />}
                label={t("website")}
                value={contact.website}
              />
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("primaryAddress")}
              </h2>
            </div>
            <div className="p-6">
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
            </div>
          </div>

          {/* Addresses */}
          <AddressManager contactId={contact.id} addresses={addresses} />

          {/* Recent Documents */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("recentDocuments")}
              </h2>
            </div>
            {recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("noDocuments")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{doc.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {td(toCamelCase(doc.type))} &middot;{" "}
                        {formatDate(doc.issueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(doc.total)}
                      </p>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_STYLES[doc.status] || STATUS_STYLES.draft,
                        )}
                      >
                        {ts(toCamelCase(doc.status))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Financial & settings */}
        <div className="space-y-6">
          {/* Financial Details */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {t("financialDetails")}
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <InfoItem label={t("vatNumber")} value={contact.vatNumber} />
              <InfoItem label={t("iban")} value={contact.iban} />
              <InfoItem label={t("bic")} value={contact.bic} />
              <InfoItem
                label={t("paymentTerms")}
                value={
                  contact.paymentTermsDays
                    ? `${contact.paymentTermsDays} ${t("days")}`
                    : null
                }
              />
              <InfoItem
                label={t("creditLimit")}
                value={
                  contact.creditLimit
                    ? formatCurrency(contact.creditLimit)
                    : null
                }
              />
            </div>
          </div>

          {/* Settings */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {tc("settings")}
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <InfoItem
                label={t("language")}
                value={contact.language?.toUpperCase()}
              />
              <InfoItem
                label={t("createdAt")}
                value={formatDate(contact.createdAt)}
              />
              <InfoItem
                label={t("updatedAt")}
                value={formatDate(contact.updatedAt)}
              />
              {contact.kivitendoId && (
                <InfoItem
                  label={t("kivitendoId")}
                  value={contact.kivitendoId.toString()}
                />
              )}
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">{tc("notes")}</h2>
              </div>
              <div className="p-6">
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value || "-"}</p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}
