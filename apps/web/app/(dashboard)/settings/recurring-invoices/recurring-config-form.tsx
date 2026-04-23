"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createRecurringConfigAction,
  updateRecurringConfigAction,
} from "@/app/actions/recurring-invoices";
import { cn } from "@/lib/utils";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import { EmailRecipientsSection } from "./email-recipients-section";

interface RecurringConfigFormProps {
  orderOptions: Array<{
    id: string;
    number: string;
    contactName: string;
  }>;
  initialData?: {
    id: string;
    orderId: string;
    periodicity: string;
    startDate: string;
    endDate: string | null;
    autoExtensionMonths: number | null;
    emailRecipients: string[] | null;
    notes: string | null;
    isActive: boolean;
  };
}

export function RecurringConfigForm({
  orderOptions,
  initialData,
}: RecurringConfigFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>(
    initialData?.emailRecipients || [],
  );

  const isEditing = !!initialData;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const input = {
        orderId: formData.get("orderId") as string,
        periodicity: formData.get("periodicity") as string,
        startDate: formData.get("startDate") as string,
        endDate: (formData.get("endDate") as string) || null,
        autoExtensionMonths: formData.get("autoExtensionMonths")
          ? parseInt(formData.get("autoExtensionMonths") as string)
          : null,
        emailRecipients: emailRecipients.length > 0 ? emailRecipients : null,
        notes: (formData.get("notes") as string) || null,
      };

      const result = isEditing
        ? await updateRecurringConfigAction(initialData.id, input)
        : await createRecurringConfigAction(input);

      if (result.success) {
        setSuccess(true);
        if (!isEditing) {
          setTimeout(() => router.push("/settings/recurring-invoices"), 1500);
        } else {
          setTimeout(() => setSuccess(false), 3000);
        }
      } else {
        setError(result.error || tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {isEditing ? t("recurring.updated") : t("recurring.created")}
        </div>
      )}

      {/* Base Order */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("recurring.baseOrderSection")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("recurring.baseOrderDesc")}
          </p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium mb-2">
            {t("recurring.baseOrder")}{" "}
            <span className="text-destructive">*</span>
          </label>
          <FormSelect
            name="orderId"
            required
            defaultValue={initialData?.orderId}
            disabled={isEditing}
          >
            <option value="">{t("recurring.selectOrder")}</option>
            {orderOptions.map((order) => (
              <option key={order.id} value={order.id}>
                {order.number} - {order.contactName}
              </option>
            ))}
          </FormSelect>
          {isEditing && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("recurring.cannotChangeOrder")}
            </p>
          )}
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("recurring.scheduleSection")}</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("recurring.periodicity.label")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <FormSelect
              name="periodicity"
              required
              defaultValue={initialData?.periodicity || "monthly"}
            >
              <option value="monthly">
                {t("recurring.periodicity.monthly")}
              </option>
              <option value="quarterly">
                {t("recurring.periodicity.quarterly")}
              </option>
              <option value="annual">
                {t("recurring.periodicity.annual")}
              </option>
            </FormSelect>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("recurring.startDate")}{" "}
              <span className="text-destructive">*</span>
            </label>
            <FormInput
              type="date"
              name="startDate"
              required
              defaultValue={initialData?.startDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("recurring.endDate")}
            </label>
            <FormInput
              type="date"
              name="endDate"
              defaultValue={initialData?.endDate || ""}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("recurring.endDateDesc")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("recurring.autoExtension")}
            </label>
            <FormInput
              type="number"
              name="autoExtensionMonths"
              min="1"
              max="60"
              defaultValue={initialData?.autoExtensionMonths || ""}
              placeholder={t("recurring.autoExtensionPlaceholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("recurring.autoExtensionDesc")}
            </p>
          </div>
        </div>
      </section>

      <EmailRecipientsSection
        initialRecipients={initialData?.emailRecipients || []}
        onChange={setEmailRecipients}
      />

      {/* Notes */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("recurring.notesSection")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("recurring.notesDesc")}
          </p>
        </div>
        <div className="p-6">
          <FormTextarea
            name="notes"
            rows={4}
            defaultValue={initialData?.notes || ""}
            placeholder={t("recurring.notesPlaceholder")}
          />
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>{t("recurring.variablesDesc")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                {"<%period_start_date%>"} - {t("recurring.var.periodStart")}
              </li>
              <li>
                {"<%period_end_date%>"} - {t("recurring.var.periodEnd")}
              </li>
              <li>
                {"<%current_month%>"} - {t("recurring.var.currentMonth")}
              </li>
              <li>
                {"<%current_year%>"} - {t("recurring.var.currentYear")}
              </li>
              <li>
                {"<%current_quarter%>"} - {t("recurring.var.currentQuarter")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            isSubmitting && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? tc("save") : tc("create")}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
