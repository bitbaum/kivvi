"use client";

import { useTranslations } from "next-intl";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import {
  INTAKE_CONTACT_ROLE_LABEL_KEYS,
  INTAKE_CONTACT_ROLE_FALLBACK,
} from "@/lib/config/document-types";

interface DocumentContactDatesCardProps {
  isIntake: boolean;
  intakeSource: string;
  onIntakeSourceChange: (v: string) => void;
  consignmentRate: string;
  onConsignmentRateChange: (v: string) => void;
  contactId: string | undefined | null;
  contactName: string | undefined;
  onContactChange: (id: string | null, name: string, paymentTermsDays?: number | null) => void;
  contactFilter?: string;
  issueDate: string;
  onIssueDateChange: (v: string) => void;
  hasDueDate: boolean;
  dueDateLabel: string;
  dueDate: string;
  onDueDateChange: (v: string) => void;
  hasDeliveryDate: boolean;
  deliveryDateLabel?: string;
  deliveryDate: string;
  onDeliveryDateChange: (v: string) => void;
}

export function DocumentContactDatesCard({
  isIntake,
  intakeSource,
  onIntakeSourceChange,
  consignmentRate,
  onConsignmentRateChange,
  contactId,
  contactName,
  onContactChange,
  contactFilter,
  issueDate,
  onIssueDateChange,
  hasDueDate,
  dueDateLabel,
  dueDate,
  onDueDateChange,
  hasDeliveryDate,
  deliveryDateLabel,
  deliveryDate,
  onDeliveryDateChange,
}: DocumentContactDatesCardProps) {
  const t = useTranslations("documents");

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      {/* Intake source selector */}
      {isIntake && (
        <div>
          <label className="block text-sm font-medium">{t("intakeSource")}</label>
          <FormSelect
            className="mt-1"
            value={intakeSource}
            onChange={(e) => onIntakeSourceChange(e.target.value)}
          >
            <option value="donation">{t("intakeSourceDonation")}</option>
            <option value="purchase">{t("intakeSourcePurchase")}</option>
            <option value="trade_in">{t("intakeSourceTradeIn")}</option>
            <option value="consignment">{t("intakeSourceConsignment")}</option>
            <option value="estate_clearance">{t("intakeSourceEstate")}</option>
            <option value="return">{t("intakeSourceReturn")}</option>
            <option value="other">{t("intakeSourceOther")}</option>
          </FormSelect>
          <p className="mt-1 text-xs text-muted-foreground">
            {intakeSource === "donation" && t("intakeSourceDonationHint")}
            {intakeSource === "purchase" && t("intakeSourcePurchaseHint")}
            {intakeSource === "trade_in" && t("intakeSourceTradeInHint")}
            {intakeSource === "consignment" && t("intakeSourceConsignmentHint")}
            {intakeSource === "estate_clearance" && t("intakeSourceEstateHint")}
            {intakeSource === "return" && t("intakeSourceReturnHint")}
          </p>
        </div>
      )}

      {isIntake && intakeSource === "consignment" && (
        <div>
          <label htmlFor="consignmentRate" className="block text-sm font-medium">
            {t("consignmentRate")}
          </label>
          <div className="relative mt-1">
            <FormInput
              id="consignmentRate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={consignmentRate}
              onChange={(e) => onConsignmentRateChange(e.target.value)}
              placeholder="30"
              className="pr-8"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("consignmentRateHint")}</p>
        </div>
      )}

      <ContactPicker
        value={contactId ?? null}
        displayValue={contactName ?? ""}
        onChange={onContactChange}
        contactType={contactFilter === "vendor" ? "vendor" : "customer"}
        label={
          isIntake
            ? t(
                (INTAKE_CONTACT_ROLE_LABEL_KEYS[intakeSource] ??
                  INTAKE_CONTACT_ROLE_FALLBACK) as Parameters<typeof t>[0],
              )
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="issueDate" className="block text-sm font-medium">
            {t("issueDate")}
          </label>
          <FormInput
            id="issueDate"
            type="date"
            value={issueDate}
            onChange={(e) => onIssueDateChange(e.target.value)}
            className="mt-1"
          />
        </div>
        {hasDueDate && (
          <div>
            <label className="block text-sm font-medium">{dueDateLabel}</label>
            <FormInput
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              min={issueDate}
              className="mt-1"
            />
            {dueDate && issueDate && dueDate < issueDate && (
              <p className="mt-1 text-xs text-warning">{t("dueDateBeforeIssueDate")}</p>
            )}
          </div>
        )}
        {hasDeliveryDate && (
          <div>
            <label className="block text-sm font-medium">
              {deliveryDateLabel ?? t("deliveryDate")}
            </label>
            <FormInput
              type="date"
              value={deliveryDate}
              onChange={(e) => onDeliveryDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
