"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAiForm } from "@fleet/ai-forms/react";
import { createContactAction, updateContactAction } from "@/app/actions/contacts";
import type { Contact } from "@kivvi/database";
import { toast } from "sonner";
import { AiFormBar } from "@/components/ui/ai-form-bar";
import { CONTACT_FORM } from "@/lib/config/ai-forms";
import { Button } from "@/components/ui/button";
import {
  ContactFormBasicSection,
  ContactFormContactSection,
  ContactFormAddressSection,
  ContactFormAdvancedSections,
} from "./contact-form-sections";

type ContactFormProps = { mode: "create"; contact?: never } | { mode: "edit"; contact: Contact };

export function ContactForm({ mode, contact }: ContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  const isEdit = mode === "edit";

  // The assistant and the user write to the same store — that is what makes a
  // second instruction ("actually they are a supplier", "shorter") apply to
  // what is already on screen. The previous fill wrote directly into the DOM,
  // so it could fill an empty form once and never revise it, and it clobbered
  // anything the user had already typed.
  //
  // Editing an existing contact starts non-empty, so `ask` refines by default
  // there; a new contact starts empty and gets filled. The user never picks.
  const assist = useAiForm({
    target: CONTACT_FORM.key,
    fields: CONTACT_FORM.fields,
    initialValues: isEdit
      ? Object.fromEntries(
          CONTACT_FORM.fields.map((field) => [
            field.name,
            (contact as Record<string, unknown>)[field.name] ?? "",
          ]),
        )
      : { type: "customer" },
  });
  const backHref = isEdit ? `/contacts/${contact.id}` : "/contacts";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      if (isEdit) {
        const result = await updateContactAction(contact.id, formData);
        if (result.success) {
          toast.success(t("updated"));
          router.push(`/contacts/${contact.id}`);
        } else {
          setError(result.error || tc("error"));
        }
      } else {
        const result = await createContactAction(formData);
        if (result.success && result.data) {
          toast.success(t("created"));
          router.push(`/contacts/${result.data.id}`);
        } else {
          setError(result.error || tc("error"));
        }
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")} {t("title")}
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{isEdit ? t("editContact") : t("newContact")}</h1>
        <p className="text-muted-foreground">
          {isEdit
            ? `${contact.name}${contact.contactNumber ? ` (${contact.contactNumber})` : ""}`
            : t("subtitle")}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        {/* Available when editing too — refining an existing contact is the
            half the old fill-only button could not do. */}
        <AiFormBar
          form={assist}
          fillPlaceholder={t("aiFillPlaceholder")}
          refinePlaceholder={t("aiRefinePlaceholder")}
        />

        <ContactFormBasicSection contact={contact} isEdit={isEdit} assist={assist} />
        <ContactFormContactSection contact={contact} isEdit={isEdit} assist={assist} />
        <ContactFormAddressSection contact={contact} isEdit={isEdit} assist={assist} />
        <ContactFormAdvancedSections
          contact={contact}
          isEdit={isEdit}
          assist={assist}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />

        <div className="flex items-center justify-end gap-4">
          <Button asChild variant="secondary">
            <Link href={backHref}>{tc("cancel")}</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? isEdit
                ? tc("saving")
                : tc("creating")
              : isEdit
                ? tc("saveChanges")
                : t("newContact")}
          </Button>
        </div>
      </form>
    </div>
  );
}
