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
import { EmailRecipientsSection } from "./email-recipients-section";
import { BaseOrderSection } from "./_components/base-order-section";
import { ScheduleSection } from "./_components/schedule-section";
import { NotesSection } from "./_components/notes-section";

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

export function RecurringConfigForm({ orderOptions, initialData }: RecurringConfigFormProps) {
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
        ? await updateRecurringConfigAction({ configId: initialData.id, input })
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

      <BaseOrderSection
        orderOptions={orderOptions}
        defaultOrderId={initialData?.orderId}
        isEditing={isEditing}
      />

      <ScheduleSection
        defaultPeriodicity={initialData?.periodicity}
        defaultStartDate={initialData?.startDate}
        defaultEndDate={initialData?.endDate}
        defaultAutoExtensionMonths={initialData?.autoExtensionMonths}
      />

      <EmailRecipientsSection
        initialRecipients={initialData?.emailRecipients || []}
        onChange={setEmailRecipients}
      />

      <NotesSection defaultNotes={initialData?.notes} />

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
