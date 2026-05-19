"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { listPriceListsAction } from "@/app/actions/pricing";
import type { PriceList } from "@kivvi/database";

/** Fetches price lists on mount and returns them. */
export function usePriceLists(): PriceList[] {
  const t = useTranslations("priceLists");
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  useEffect(() => {
    listPriceListsAction()
      .then((r: Awaited<ReturnType<typeof listPriceListsAction>>) => {
        if (r.success && r.data) setPriceLists(r.data);
      })
      .catch(() => toast.error(t("errorFailedToLoad")));
  }, [t]);

  return priceLists;
}
