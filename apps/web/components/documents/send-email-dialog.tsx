"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendDocumentEmailAction } from "@/app/actions/email";
import { toast } from "sonner";
import { FormInput } from "@/components/ui/form-field";

interface SendEmailButtonProps {
  documentId: string;
  defaultEmail?: string;
}

export function SendEmailButton({
  documentId,
  defaultEmail,
}: SendEmailButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
  const [ccSender, setCcSender] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const t = useTranslations("documents");
  const tc = useTranslations("common");

  // Move focus to email input when form opens
  useEffect(() => {
    if (isOpen && !sent) {
      emailInputRef.current?.focus();
    }
  }, [isOpen, sent]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-expanded={false}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
      >
        <Send className="h-4 w-4" />
        {tc("email")}
      </button>
    );
  }

  if (sent) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        {t("emailSent")}
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await sendDocumentEmailAction(documentId, email, ccSender);
      if (result.success) {
        setSent(true);
        toast.success(t("emailSent"));
        router.refresh();
        setTimeout(() => {
          setSent(false);
          setIsOpen(false);
        }, 2500);
      } else {
        setError(result.error || t("emailSendFailed"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-2"
        role="region"
        aria-label={t("emailSend")}
      >
        <FormInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          className="w-full sm:w-56"
          ref={emailInputRef}
        />
        <button
          type="submit"
          disabled={isPending || !email}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isPending ? t("emailSending") : t("emailSend")}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          {tc("cancel")}
        </button>
      </form>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={ccSender}
          onChange={(e) => setCcSender(e.target.checked)}
          className="h-3.5 w-3.5 rounded"
        />
        {t("ccSender")}
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
