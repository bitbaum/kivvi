"use client";

import { useTranslations } from "next-intl";
import { FormSelect } from "@/components/ui/form-field";

interface OrderOption {
  id: string;
  number: string;
  contactName: string;
}

interface Props {
  orderOptions: OrderOption[];
  defaultOrderId?: string;
  isEditing: boolean;
}

export function BaseOrderSection({
  orderOptions,
  defaultOrderId,
  isEditing,
}: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("recurring.baseOrderSection")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("recurring.baseOrderDesc")}
        </p>
      </div>
      <div className="p-6">
        <label
          htmlFor="recurring-orderId"
          className="mb-2 block text-sm font-medium"
        >
          {t("recurring.baseOrder")} <span className="text-destructive">*</span>
        </label>
        <FormSelect
          id="recurring-orderId"
          name="orderId"
          required
          defaultValue={defaultOrderId}
          disabled={isEditing}
        >
          <option value="">{t("recurring.selectOrder")}</option>
          {orderOptions.map((order) => (
            <option key={order.id} value={order.id}>
              {order.number} - {order.contactName}
            </option>
          ))}
        </FormSelect>
        {isEditing && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("recurring.cannotChangeOrder")}
          </p>
        )}
      </div>
    </section>
  );
}
