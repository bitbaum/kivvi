"use server";

import { createDunning } from "@kivvi/core";
import { createAction } from "./action-factory";
import { getTranslations } from "next-intl/server";

export const createDunningAction = createAction<
  string,
  { id: string; number: string; newLevel: string }
>({
  handler: async (invoiceId, { companyId, userId, db }) => {
    const { dunningDoc, newLevel } = await createDunning(db, companyId, userId, invoiceId);
    return { id: dunningDoc.id, number: dunningDoc.number, newLevel };
  },
  revalidate: ["/sales/dunning", "/sales/invoices", "/dashboard"],
  errorMessage: () => getTranslations("dunning").then((t) => t("errorCreateDunning")),
  minRole: "member",
});
