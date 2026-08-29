import { Building2, CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CardSection } from "@/components/card-section";
import { InfoItem } from "@/components/info-display";
import type { getContact } from "@kivvi/core";

type Contact = NonNullable<Awaited<ReturnType<typeof getContact>>>["contact"];

interface ContactDetailSidebarProps {
  contact: Contact;
}

export async function ContactDetailSidebar({ contact }: ContactDetailSidebarProps) {
  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6">
      {/* Financial Details */}
      <CardSection title={t("financialDetails")} icon={<CreditCard className="h-4 w-4" />}>
        <div className="space-y-4">
          <InfoItem label={t("vatNumber")} value={contact.vatNumber} copyable />
          <InfoItem label={t("iban")} value={contact.iban} copyable />
          <InfoItem label={t("bic")} value={contact.bic} copyable />
          <InfoItem
            label={t("paymentTerms")}
            value={contact.paymentTermsDays ? `${contact.paymentTermsDays} ${t("days")}` : null}
          />
          <InfoItem
            label={t("creditLimit")}
            value={contact.creditLimit ? formatCurrency(contact.creditLimit) : null}
          />
        </div>
      </CardSection>

      {/* Settings */}
      <CardSection title={tc("settings")} icon={<Building2 className="h-4 w-4" />}>
        <div className="space-y-4">
          <InfoItem label={t("language")} value={contact.language?.toUpperCase()} />
          <InfoItem label={t("createdAt")} value={formatDate(contact.createdAt)} />
          <InfoItem label={t("updatedAt")} value={formatDate(contact.updatedAt)} />
          {contact.kivitendoId && (
            <InfoItem label={t("kivitendoId")} value={contact.kivitendoId.toString()} />
          )}
        </div>
      </CardSection>

      {/* Notes */}
      {contact.notes && (
        <CardSection title={tc("notes")}>
          <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
        </CardSection>
      )}
    </div>
  );
}
