"use client";

import { useState, useTransition, useRef } from "react";
import { X, Loader2, UserPlus } from "lucide-react";
import { createContactAction } from "@/app/actions/contacts";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CONTACT_TYPES } from "@/lib/config/contact-types";
import { FormInput } from "@/components/ui/form-field";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface QuickCreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contact: { id: string; name: string }) => void;
  initialName?: string;
  contactType?: "customer" | "vendor" | "both";
}

export function QuickCreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
  contactType = "customer",
}: QuickCreateContactModalProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, handleClose);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"customer" | "vendor" | "both">(contactType);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleClose() {
    if (isPending) return;
    setName(initialName);
    setEmail("");
    setPhone("");
    setType(contactType);
    setError(null);
    setFieldErrors({});
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("type", type);
      if (email.trim()) formData.append("email", email.trim());
      if (phone.trim()) formData.append("phone", phone.trim());

      const result = await createContactAction(formData);

      if (result.success && result.data) {
        onSuccess({ id: result.data.id, name: name.trim() });
        handleClose();
      } else {
        setError(result.error || tc("error"));
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-create-title"
        className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-lg"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          aria-label={tc("close")}
          className="absolute right-4 top-4 flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 id="quick-create-title" className="text-xl font-semibold">
              {t("quickCreate")}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("quickCreateDesc")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <span className="mb-2 block text-sm font-medium">
              {t("type")} *
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CONTACT_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  disabled={isPending}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                    type === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {t(`types.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Name (required) */}
          <div>
            <label htmlFor="qc-name" className="mb-2 block text-sm font-medium">
              {t("name")} *
            </label>
            <FormInput
              id="qc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder={t("namePlaceholder")}
              error={!!fieldErrors.name}
              autoFocus
            />
            {fieldErrors.name && (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          {/* Email (optional) */}
          <div>
            <label
              htmlFor="qc-email"
              className="mb-2 block text-sm font-medium"
            >
              {t("email")}
            </label>
            <FormInput
              id="qc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder={t("emailPlaceholder")}
              error={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label
              htmlFor="qc-phone"
              className="mb-2 block text-sm font-medium"
            >
              {t("phone")}
            </label>
            <FormInput
              id="qc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              placeholder={t("phonePlaceholder")}
              error={!!fieldErrors.phone}
            />
            {fieldErrors.phone && (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {fieldErrors.phone[0]}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className={cn(
                "flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                (isPending || !name.trim()) && "opacity-50 cursor-not-allowed",
              )}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tc("creating")}
                </span>
              ) : (
                tc("create")
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {tc("cancel")}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t("quickCreateNote")}
          </p>
        </form>
      </div>
    </div>
  );
}
