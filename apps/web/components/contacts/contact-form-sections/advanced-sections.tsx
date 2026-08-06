"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Contact } from "@kivvi/database";
import type { UseAiForm } from "@fleet/ai-forms/react";
import { bindField, bindCheckbox } from "@/lib/ai-form-binding";
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
  /** Shared store: the user and the assistant write to the same values. */
  assist: UseAiForm;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function ContactFormAdvancedSections({
  contact,
  isEdit,
  assist,
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
                  {...bindField(assist, "vatNumber")}
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
                  {...bindField(assist, "iban")}
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
                  {...bindField(assist, "paymentTermsDays")}
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
                  {...bindField(assist, "creditLimit")}
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
                  {...bindField(assist, "language")}
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
                  {...bindField(assist, "notes")}
                  placeholder={!isEdit ? t("internalNotes") : undefined}
                  className="resize-y"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dunningBlock"
                  name="dunningBlock"
                  {...bindCheckbox(assist, "dunningBlock")}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="dunningBlock" className="text-sm font-medium">
                  {t("dunningBlock")}
                </label>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
