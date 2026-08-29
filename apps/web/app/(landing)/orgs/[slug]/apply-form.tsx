"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-field";
import { createJoinRequestAction } from "@/app/actions/participation";

interface ApplyFormProps {
  companyId: string;
  vacancyId?: string | null;
  isAuthenticated: boolean;
}

export function ApplyForm({ companyId, vacancyId = null, isAuthenticated }: ApplyFormProps) {
  const t = useTranslations("orgs");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link href="/login">{t("loginToApply")}</Link>
      </Button>
    );
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/5 p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        {t("applySuccess")}
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createJoinRequestAction({
        companyId,
        vacancyId,
        message,
      });
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error || t("applyError"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      <FormTextarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("messagePlaceholder")}
        maxLength={2000}
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {t("apply")}
      </Button>
    </form>
  );
}
