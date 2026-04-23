"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContactAction,
  updateContactAction,
} from "@/app/actions/contacts";
import type { Contact } from "@kivvi/database";
import { toast } from "sonner";
import { ContactAiFillButton } from "./ai-fill-button";
import { Button } from "@/components/ui/button";
import type { ExtractedContact } from "@/app/actions/ai-extract";
import {
  ContactFormBasicSection,
  ContactFormContactSection,
  ContactFormAddressSection,
  ContactFormAdvancedSections,
} from "./contact-form-sections";

interface ContactFormProps {
  mode: "create" | "edit";
  contact?: Contact;
}

export function ContactForm({ mode, contact }: ContactFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  function handleAiFill(data: ExtractedContact) {
    if (!formRef.current) return;
    const form = formRef.current;
    const set = (name: string, value: string | null | undefined) => {
      if (!value) return;
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };
    set("name", data.name);
    set("firstName", data.firstName);
    set("lastName", data.lastName);
    set("email", data.email);
    set("phone", data.phone);
    set("mobile", data.mobile);
    set("website", data.website);
    set("address", data.address);
    set("postalCode", data.postalCode);
    set("city", data.city);
    set("country", data.country);
    set("vatNumber", data.vatNumber);
    set("notes", data.notes);
  }

  const isEdit = mode === "edit";
  const backHref = isEdit ? `/contacts/${contact!.id}` : "/contacts";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      if (isEdit) {
        const result = await updateContactAction(contact!.id, formData);
        if (result.success) {
          toast.success(t("updated"));
          router.push(`/contacts/${contact!.id}`);
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
        <h1 className="text-3xl font-bold">
          {isEdit ? t("editContact") : t("newContact")}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? `${contact!.name}${contact!.contactNumber ? ` (${contact!.contactNumber})` : ""}`
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
        {!isEdit && <ContactAiFillButton onFill={handleAiFill} />}

        <ContactFormBasicSection contact={contact} isEdit={isEdit} />
        <ContactFormContactSection contact={contact} isEdit={isEdit} />
        <ContactFormAddressSection contact={contact} isEdit={isEdit} />
        <ContactFormAdvancedSections
          contact={contact}
          isEdit={isEdit}
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
