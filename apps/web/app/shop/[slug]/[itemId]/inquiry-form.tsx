"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendShopInquiryAction } from "@/app/actions/shop";
import { Check, Send } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string;
  itemId: string;
  itemDescription: string;
  slug: string;
}

export function ShopInquiryForm({ companyId, companyName, itemId, itemDescription, slug }: Props) {
  const t = useTranslations("shop.inquiry");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await sendShopInquiryAction({
        companyId,
        itemId,
        itemDescription,
        slug,
        senderName: name.trim(),
        senderEmail: email.trim(),
        message: message.trim() || undefined,
      });
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error ?? t("sendError"));
      }
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-success/5 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <Check className="h-6 w-6 text-success" />
        </div>
        <div>
          <p className="font-semibold">{t("sentTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("sentMessage", { companyName })}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="font-semibold">{t("title")}</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">
          {tCommon("name")} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={t("namePlaceholder")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">
          {tCommon("email")} *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t("emailPlaceholder")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">
          {t("messageLabel")}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim() || !email.trim()}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
      >
        {isPending ? (
          t("sending")
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t("send")}
          </>
        )}
      </button>
    </form>
  );
}
