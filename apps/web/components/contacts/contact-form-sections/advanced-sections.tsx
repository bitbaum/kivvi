"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Contact } from "@kivvi/database";
import { LANGUAGE_OPTIONS } from "@/lib/config/locales";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import { DEFAULT_PAYMENT_TERMS_DAYS } from "@/lib/config/document-types";
import { Button } from "@/components/ui/button";

interface AdvancedSectionsProps {
  contact?: Contact;
  isEdit: boolean;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function ContactFormAdvancedSections({
  contact,
  isEdit,
  showAdvanced,
  onToggleAdvanced,
}: AdvancedSectionsProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  return (
    <>
      {!isEdit && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={onToggleAdvanced}
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {tc("hideAdvanced")}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {tc("showAdvanced")}
            </>
          )}
        </Button>
      )}

      {(isEdit || showAdvanced) && (
        <>
          <section className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{t("financialDetails")}</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vatNumber"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("vatNumber")}
                </label>
                <FormInput
                  type="text"
                  id="vatNumber"
                  name="vatNumber"
                  maxLength={30}
                  defaultValue={contact?.vatNumber || ""}
                  placeholder={
                    !isEdit ? t("placeholders.vatNumber") : undefined
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="iban"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("iban")}
                </label>
                <FormInput
                  type="text"
                  id="iban"
                  name="iban"
                  maxLength={34}
                  defaultValue={contact?.iban || ""}
                  placeholder={
                    !isEdit ? "CH93 0076 2011 6238 5295 7" : undefined
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="paymentTermsDays"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("paymentTerms")} ({t("days")})
                </label>
                <FormInput
                  type="number"
                  id="paymentTermsDays"
                  name="paymentTermsDays"
                  min={0}
                  max={365}
                  defaultValue={
                    contact?.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="creditLimit"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("creditLimit")} (CHF)
                </label>
                <FormInput
                  type="text"
                  id="creditLimit"
                  name="creditLimit"
                  defaultValue={contact?.creditLimit || ""}
                  placeholder={!isEdit ? "10000.00" : undefined}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{tc("settings")}</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="language"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("language")}
                </label>
                <FormSelect
                  id="language"
                  name="language"
                  defaultValue={contact?.language || "de"}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {tc("notes")}
                </label>
                <FormTextarea
                  id="notes"
                  name="notes"
                  rows={4}
                  maxLength={5000}
                  defaultValue={contact?.notes || ""}
                  placeholder={!isEdit ? t("internalNotes") : undefined}
                  className="resize-y"
                />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
