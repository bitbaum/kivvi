"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";

export function DateRangeForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const t = useTranslations("reports");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="start" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t("fromDate")}
        </label>
        <FormInput
          id="start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="end" className="mb-1 block text-sm font-medium text-muted-foreground">
          {t("toDate")}
        </label>
        <FormInput id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Search className="h-4 w-4" />
        {t("generate")}
      </button>
    </form>
  );
}
