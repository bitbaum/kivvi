"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Loader2 } from "lucide-react";
import { updateDocumentStatusAction } from "@/app/actions/documents";
import { sendDocumentEmailAction } from "@/app/actions/email";
import { toast } from "sonner";

/**
 * Combined "Send" button for draft documents.
 * Marks the document as "sent" (creating journal entry) then sends email to the contact.
 * This is the primary CTA for invoice workflows — one button instead of two steps.
 */
export function SendAndMarkButton({
  documentId,
  contactEmail,
}: {
  documentId: string;
  contactEmail?: string;
}) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      // Step 1: Mark as sent (creates journal entry)
      const statusResult = await updateDocumentStatusAction(documentId, "sent");
      if (!statusResult.success) {
        toast.error(statusResult.error || tc("error"));
        return;
      }

      // Step 2: Send email if contact has email
      if (contactEmail) {
        const emailResult = await sendDocumentEmailAction(documentId, contactEmail);
        if (emailResult.success) {
          toast.success(t("sentAndEmailed"));
        } else {
          // Status was updated but email failed — inform user
          toast.success(t("markedAsSent"));
          toast.error(emailResult.error || t("emailFailed"));
        }
      } else {
        toast.success(t("markedAsSent"));
      }

      router.refresh();
    });
  }

  return (
    <button
      onClick={handleSend}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 min-h-[44px] disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {t("sendDocument")}
    </button>
  );
}
