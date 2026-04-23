"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";
import { toast } from "sonner";

interface EmailRecipientsSectionProps {
  initialRecipients: string[];
  onChange: (recipients: string[]) => void;
}

export function EmailRecipientsSection({
  initialRecipients,
  onChange,
}: EmailRecipientsSectionProps) {
  const t = useTranslations("settings");
  const [recipients, setRecipients] = useState<string[]>(initialRecipients);
  const [newEmail, setNewEmail] = useState("");

  function addRecipient() {
    const email = newEmail.trim();
    if (!email) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("recurring.invalidEmail"));
      return;
    }

    if (recipients.includes(email)) {
      toast.error(t("recurring.emailAlreadyAdded"));
      return;
    }

    const updated = [...recipients, email];
    setRecipients(updated);
    onChange(updated);
    setNewEmail("");
  }

  function removeRecipient(email: string) {
    const updated = recipients.filter((e) => e !== email);
    setRecipients(updated);
    onChange(updated);
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("recurring.emailSection")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("recurring.emailDesc")}
        </p>
      </div>
      <div className="p-6 space-y-4">
        {recipients.length > 0 && (
          <div className="space-y-2">
            {recipients.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
              >
                <span className="text-sm">{email}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <FormInput
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRecipient();
              }
            }}
            placeholder={t("recurring.emailPlaceholder")}
            className="flex-1"
          />
          <button
            type="button"
            onClick={addRecipient}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("recurring.addEmail")}
          </button>
        </div>
      </div>
    </section>
  );
}
