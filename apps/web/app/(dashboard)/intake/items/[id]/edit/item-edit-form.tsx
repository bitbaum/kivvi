"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { CardSection } from "@/components/card-section";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import {
  updateInventoryItemAction,
  updateItemStatusAction,
  updateItemConditionAction,
} from "@/app/actions/inventory-items";
import { getValidTransitions } from "@/lib/config/inventory-items";
import { useTranslations } from "next-intl";
import { ItemDetailsFields } from "./item-details-fields";
import { ItemPhotoUpload } from "@/components/inventory/item-photo-upload";
import { ItemSpecsEditor } from "@/components/inventory/item-specs-editor";
import { RepairSection } from "@/components/inventory/repair-section";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ItemEditFormProps {
  item: {
    id: string;
    itemNumber: string;
    description: string;
    condition: string;
    status: string;
    category: string | null;
    serialNumber: string | null;
    location: string | null;
    estimatedValue: string | null;
    askingPrice: string | null;
    minPrice: string | null;
    notes: string | null;
    repairCost: string | null;
    repairHours: string | null;
    repairLog: string | null;
    photoBase64: string | null;
    specs?: Record<string, string> | null;
    assignedToUserId: string | null;
  };
  companyUsers: { id: string; label: string }[];
}

export function ItemEditForm({
  item: initialItem,
  companyUsers,
}: ItemEditFormProps) {
  const router = useRouter();
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState(initialItem);

  // Controlled state for gate-relevant fields — drives pre-flight warnings only.
  const [selectedStatus, setSelectedStatus] = useState(initialItem.status);
  const [selectedCondition, setSelectedCondition] = useState(
    initialItem.condition,
  );
  const [enteredAskingPrice, setEnteredAskingPrice] = useState(
    initialItem.askingPrice || "",
  );

  // Only show statuses that are valid transitions from current + current status
  const validNextStatuses = [item.status, ...getValidTransitions(item.status)];

  // Pre-flight gate warnings — only relevant when transitioning to ready_for_sale
  const gateWarnings: string[] = [];
  if (selectedStatus === "ready_for_sale") {
    if (selectedCondition === "untested")
      gateWarnings.push("conditionRequired");
    if (!enteredAskingPrice || parseFloat(enteredAskingPrice) <= 0)
      gateWarnings.push("askingPriceRequired");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const newCondition = formData.get("condition") as string;
    const newStatus = formData.get("status") as string;

    startTransition(async () => {
      const specsRaw = formData.get("specs") as string;
      let specs: Record<string, string> | null = null;
      try {
        const parsed = JSON.parse(specsRaw);
        specs = Object.keys(parsed).length > 0 ? parsed : null;
      } catch {
        /* ignore malformed */
      }

      // Step 1: update condition first (gate reads condition from DB)
      if (newCondition !== item.condition) {
        const condResult = await updateItemConditionAction(item.id, {
          condition: newCondition,
        });
        if (!condResult.success) {
          setError(condResult.error || tc("error"));
          return;
        }
      }

      // Step 2: save all other fields (incl. askingPrice) before status transition,
      // so the ready_for_sale gate reads the freshly-saved price from the DB.
      const result = await updateInventoryItemAction(item.id, {
        description: formData.get("description") as string,
        category: (formData.get("category") as string) || null,
        askingPrice: (formData.get("askingPrice") as string) || null,
        minPrice: (formData.get("minPrice") as string) || null,
        estimatedValue: (formData.get("estimatedValue") as string) || null,
        serialNumber: (formData.get("serialNumber") as string) || null,
        location: (formData.get("location") as string) || null,
        notes: (formData.get("notes") as string) || null,
        assignedToUserId: (formData.get("assignedToUserId") as string) || null,
        specs,
      });

      if (!result.success) {
        setError(result.error || tc("error"));
        return;
      }

      // Step 3: transition status last so all gate checks see updated DB state
      if (newStatus !== item.status) {
        const statusResult = await updateItemStatusAction(item.id, {
          newStatus,
        });
        if (!statusResult.success) {
          setError(statusResult.error || tc("error"));
          return;
        }
      }

      toast.success(tc("saved"));
      router.push(`/intake/items/${item.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Photo */}
      <CardSection title={ti("photo")}>
        <ItemPhotoUpload
          itemId={item.id}
          initialPhotoBase64={item.photoBase64}
        />
      </CardSection>

      {/* Repair log */}
      {(item.status === "testing" ||
        item.status === "repair" ||
        (item.repairCost && parseFloat(item.repairCost) > 0)) && (
        <RepairSection
          itemId={item.id}
          currentCost={item.repairCost}
          currentHours={item.repairHours}
          currentLog={item.repairLog}
          onRecorded={(updated) => setItem({ ...item, ...updated })}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <CardSection title={ti("itemDetails")}>
          <ItemDetailsFields
            item={item}
            validNextStatuses={validNextStatuses}
            selectedCondition={selectedCondition}
            onConditionChange={setSelectedCondition}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            companyUsers={companyUsers}
          />
        </CardSection>

        {/* Pre-flight gate warnings: shown when ready_for_sale is selected */}
        {gateWarnings.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 space-y-1">
            {gateWarnings.map((key) => (
              <p key={key} className="text-sm text-warning">
                ⚠ {ti(key as Parameters<typeof ti>[0])}
              </p>
            ))}
          </div>
        )}

        <CardSection title={ti("specifications")}>
          <ItemSpecsEditor initialSpecs={item.specs} />
        </CardSection>

        <CardSection title={ti("pricing")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="estimatedValue"
                className="mb-1.5 block text-sm font-medium"
              >
                {ti("estimatedValue")}
              </label>
              <FormInput
                id="estimatedValue"
                name="estimatedValue"
                defaultValue={item.estimatedValue || ""}
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="askingPrice"
                className="mb-1.5 block text-sm font-medium"
              >
                {ti("askingPrice")}
              </label>
              <FormInput
                id="askingPrice"
                name="askingPrice"
                value={enteredAskingPrice}
                onChange={(e) => setEnteredAskingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label
                htmlFor="minPrice"
                className="mb-1.5 block text-sm font-medium"
              >
                {ti("minPrice")}
              </label>
              <FormInput
                id="minPrice"
                name="minPrice"
                defaultValue={item.minPrice || ""}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardSection>

        <CardSection title={tc("notes")}>
          <FormTextarea name="notes" defaultValue={item.notes || ""} rows={4} />
        </CardSection>

        <div className="flex justify-end gap-3">
          <Button asChild variant="secondary">
            <Link href={`/intake/items/${item.id}`}>{tc("cancel")}</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {tc("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
