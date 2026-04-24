"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { sendDonationReceiptEmailAction } from "@/app/actions/email";
import { useTranslations } from "next-intl";

interface Props {
  intakeId: string;
}

export function SendReceiptButton({ intakeId }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ti = useTranslations("intake");

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const result = await sendDonationReceiptEmailAction(intakeId);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error || ti("donationReceiptError"));
      }
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
        <Mail className="h-3.5 w-3.5" />
        {ti("donationReceiptSent")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={sending}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
      >
        <Mail className="h-3.5 w-3.5" />
        {sending ? ti("donationReceiptSending") : ti("sendDonationReceipt")}
      </button>
      {error && (
        <p className="text-xs text-destructive max-w-48 text-right">{error}</p>
      )}
    </div>
  );
}
