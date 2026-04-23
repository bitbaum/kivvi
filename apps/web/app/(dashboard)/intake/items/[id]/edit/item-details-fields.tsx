"use client";

import { FormInput, FormSelect } from "@/components/ui/form-field";
import { useTranslations } from "next-intl";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import {
  getStatusLabelKey,
  getConditionLabelKey,
} from "@/lib/config/inventory-items";
import {
  ITEM_CATEGORIES,
  getChecklistTemplate,
} from "@kivvi/core/src/config/checklist-templates";

interface ItemDetailsFieldsProps {
  item: {
    description: string;
    condition: string;
    status: string;
    serialNumber: string | null;
    category: string | null;
    location: string | null;
    assignedToUserId: string | null;
  };
  validNextStatuses: string[];
  selectedCondition: string;
  onConditionChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  companyUsers: { id: string; label: string }[];
}

export function ItemDetailsFields({
  item,
  validNextStatuses,
  selectedCondition,
  onConditionChange,
  selectedStatus,
  onStatusChange,
  companyUsers,
}: ItemDetailsFieldsProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const tl = useTranslations("checklist");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium"
        >
          {tc("description")} <span className="text-destructive">*</span>
        </label>
        <FormInput
          id="description"
          name="description"
          required
          defaultValue={item.description}
        />
      </div>
      <div>
        <label htmlFor="condition" className="mb-1.5 block text-sm font-medium">
          {ti("condition")}
        </label>
        <FormSelect
          id="condition"
          name="condition"
          value={selectedCondition}
          onChange={(e) => onConditionChange(e.target.value)}
        >
          {ITEM_CONDITION_VALUES.map((c) => (
            <option key={c} value={c}>
              {ti(getConditionLabelKey(c))}
            </option>
          ))}
        </FormSelect>
      </div>
      <div>
        <label htmlFor="status" className="mb-1.5 block text-sm font-medium">
          {ti("status")}
        </label>
        <FormSelect
          id="status"
          name="status"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {ITEM_STATUS_VALUES.filter((s) => validNextStatuses.includes(s)).map(
            (s) => (
              <option key={s} value={s}>
                {ti(getStatusLabelKey(s))}
              </option>
            ),
          )}
        </FormSelect>
      </div>
      <div>
        <label
          htmlFor="serialNumber"
          className="mb-1.5 block text-sm font-medium"
        >
          {ti("serialNumber")}
        </label>
        <FormInput
          id="serialNumber"
          name="serialNumber"
          defaultValue={item.serialNumber || ""}
        />
      </div>
      <div>
        <label htmlFor="category" className="mb-1.5 block text-sm font-medium">
          {ti("category")}
        </label>
        <FormSelect
          id="category"
          name="category"
          defaultValue={item.category || ""}
        >
          <option value="">{ti("selectCategory")}</option>
          {ITEM_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {tl(getChecklistTemplate(cat).labelKey)}
            </option>
          ))}
        </FormSelect>
      </div>
      <div>
        <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
          {ti("locationShelf")}
        </label>
        <FormInput
          id="location"
          name="location"
          defaultValue={item.location || ""}
        />
      </div>
      <div>
        <label
          htmlFor="assignedToUserId"
          className="mb-1.5 block text-sm font-medium"
        >
          {ti("assignedTo")}
        </label>
        <FormSelect
          id="assignedToUserId"
          name="assignedToUserId"
          defaultValue={item.assignedToUserId || ""}
        >
          <option value="">{ti("unassigned")}</option>
          {companyUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </FormSelect>
      </div>
    </div>
  );
}
