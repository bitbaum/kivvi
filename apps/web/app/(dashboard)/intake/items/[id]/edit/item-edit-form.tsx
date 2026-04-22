"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { CardSection } from "@/components/card-section";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import {
  updateInventoryItemAction,
  updateItemStatusAction,
  updateItemConditionAction,
  recordRepairAction,
} from "@/app/actions/inventory-items";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import {
  getStatusLabelKey,
  getConditionLabelKey,
  getValidTransitions,
} from "@/lib/config/inventory-items";
import { useTranslations } from "next-intl";
import { ItemPhotoUpload } from "@/components/inventory/item-photo-upload";
import { ItemSpecsEditor } from "@/components/inventory/item-specs-editor";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ITEM_CATEGORIES,
  getChecklistTemplate,
} from "@kivvi/core/src/config/checklist-templates";

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
  const tl = useTranslations("checklist");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState(initialItem);

  // Only show statuses that are valid transitions from current + current status
  const validNextStatuses = [item.status, ...getValidTransitions(item.status)];

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
          setError(condResult.error || "Failed to update condition");
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
        setError(result.error || "Failed to update");
        return;
      }

      // Step 3: transition status last so all gate checks see updated DB state
      if (newStatus !== item.status) {
        const statusResult = await updateItemStatusAction(item.id, {
          newStatus,
        });
        if (!statusResult.success) {
          setError(statusResult.error || "Failed to update status");
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
              <label
                htmlFor="condition"
                className="mb-1.5 block text-sm font-medium"
              >
                {ti("condition")}
              </label>
              <FormSelect
                id="condition"
                name="condition"
                defaultValue={item.condition}
              >
                {ITEM_CONDITION_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {ti(getConditionLabelKey(c))}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-sm font-medium"
              >
                {ti("status")}
              </label>
              <FormSelect id="status" name="status" defaultValue={item.status}>
                {ITEM_STATUS_VALUES.filter((s) =>
                  validNextStatuses.includes(s),
                ).map((s) => (
                  <option key={s} value={s}>
                    {ti(getStatusLabelKey(s))}
                  </option>
                ))}
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
              <label
                htmlFor="category"
                className="mb-1.5 block text-sm font-medium"
              >
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
              <label
                htmlFor="location"
                className="mb-1.5 block text-sm font-medium"
              >
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
        </CardSection>

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
                defaultValue={item.askingPrice || ""}
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

// Repair section (stays client-side since it has interactive state)
function RepairSection({
  itemId,
  currentCost,
  currentHours,
  currentLog,
  onRecorded,
}: {
  itemId: string;
  currentCost: string | null;
  currentHours: string | null;
  currentLog: string | null;
  onRecorded: (updated: {
    repairCost: string | null;
    repairHours: string | null;
    repairLog: string | null;
  }) => void;
}) {
  const ti = useTranslations("inventory");
  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const totalCost = currentCost ? parseFloat(currentCost) : 0;
  const totalHours = currentHours ? parseFloat(currentHours) : 0;

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!cost) return;
    setIsRecording(true);
    setRepairError(null);

    const result = await recordRepairAction(itemId, {
      cost,
      hours: hours || undefined,
      note: note || undefined,
    });

    if (result.success) {
      const newCost = (totalCost + parseFloat(cost)).toFixed(2);
      const newHours = (totalHours + parseFloat(hours || "0")).toFixed(2);
      const date = new Date().toISOString().split("T")[0];
      const entry = `${date} — ${parseFloat(cost).toFixed(2)}${hours ? ` / ${hours}h` : ""}${note ? `: ${note}` : ""}`;
      const newLog = currentLog ? `${currentLog}\n${entry}` : entry;
      onRecorded({
        repairCost: newCost,
        repairHours: newHours,
        repairLog: newLog,
      });
      setCost("");
      setHours("");
      setNote("");
      toast.success(ti("repairRecorded"));
    } else {
      setRepairError(result.error || "Failed to record repair");
    }

    setIsRecording(false);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{ti("repairLog")}</h2>
        {totalCost > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Total: {totalCost.toFixed(2)}
            {totalHours > 0 && ` · ${totalHours}h`}
          </p>
        )}
      </div>
      <div className="space-y-4 p-6">
        {currentLog && (
          <pre className="whitespace-pre-wrap rounded bg-muted/30 p-3 font-mono text-xs">
            {currentLog}
          </pre>
        )}
        <form onSubmit={handleRecord} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {ti("costField")} *
              </label>
              <FormInput
                type="text"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="40.00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {ti("hours")}
              </label>
              <FormInput
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {ti("note")}
              </label>
              <FormInput
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          {repairError && (
            <p className="text-xs text-destructive">{repairError}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={isRecording || !cost}>
              {isRecording && <Loader2 className="h-4 w-4 animate-spin" />}
              {ti("recordRepair")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
