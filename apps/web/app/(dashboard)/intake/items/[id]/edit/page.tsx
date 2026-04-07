"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import {
  updateInventoryItemAction,
  updateItemStatusAction,
  updateItemConditionAction,
  getInventoryItemAction,
  recordRepairAction,
} from "@/app/actions/inventory-items";
import {
  ITEM_STATUS_VALUES,
  ITEM_CONDITION_VALUES,
} from "@kivvi/database/src/enums";
import { ItemPhotoUpload } from "@/components/inventory/item-photo-upload";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  testing: "Testing",
  repair: "Repair",
  ready_for_sale: "Ready for Sale",
  listed: "Listed",
  reserved: "Reserved",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  recycled: "Recycled",
};

const CONDITION_LABELS: Record<string, string> = {
  untested: "Untested",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  parts_only: "Parts Only",
  scrap: "Scrap",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditInventoryItemPage({ params }: PageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState<string>("");

  useEffect(() => {
    params.then(({ id }) => {
      setItemId(id);
      getInventoryItemAction(id).then((result) => {
        if (result.success && result.data) {
          setItem(result.data);
        }
        setLoading(false);
      });
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Item not found
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const newCondition = formData.get("condition") as string;
    const newStatus = formData.get("status") as string;

    startTransition(async () => {
      // Update condition if changed
      if (newCondition !== item.condition) {
        const condResult = await updateItemConditionAction(itemId, {
          condition: newCondition,
        });
        if (!condResult.success) {
          setError(condResult.error || "Failed to update condition");
          return;
        }
      }

      // Update status if changed
      if (newStatus !== item.status) {
        const statusResult = await updateItemStatusAction(itemId, {
          newStatus,
        });
        if (!statusResult.success) {
          setError(statusResult.error || "Failed to update status");
          return;
        }
      }

      // Update other fields
      const result = await updateInventoryItemAction(itemId, {
        description: formData.get("description") as string,
        askingPrice: (formData.get("askingPrice") as string) || null,
        minPrice: (formData.get("minPrice") as string) || null,
        estimatedValue: (formData.get("estimatedValue") as string) || null,
        serialNumber: (formData.get("serialNumber") as string) || null,
        location: (formData.get("location") as string) || null,
        notes: (formData.get("notes") as string) || null,
      });

      if (result.success) {
        toast.success("Item updated");
        router.push(`/intake/items/${itemId}`);
        router.refresh();
      } else {
        setError(result.error || "Failed to update");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/intake/items/${itemId}`}
          className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit {item.itemNumber}</h1>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Photo upload */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Photo</h2>
        </div>
        <div className="p-6">
          <ItemPhotoUpload
            itemId={itemId}
            initialPhotoBase64={item.photoBase64 || null}
          />
        </div>
      </div>

      {/* Repair log (only shown when relevant) */}
      {(item.status === "testing" ||
        item.status === "repair" ||
        (item.repairCost && parseFloat(item.repairCost) > 0)) && (
        <RepairSection
          itemId={itemId}
          currentCost={item.repairCost}
          currentHours={item.repairHours}
          currentLog={item.repairLog}
          onRecorded={(updated) => {
            setItem({ ...item, ...updated });
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Item Details</h2>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium"
              >
                Description <span className="text-destructive">*</span>
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
                Condition
              </label>
              <FormSelect
                id="condition"
                name="condition"
                defaultValue={item.condition}
              >
                {ITEM_CONDITION_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c] || c}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div>
              <label
                htmlFor="status"
                className="mb-1.5 block text-sm font-medium"
              >
                Status
              </label>
              <FormSelect id="status" name="status" defaultValue={item.status}>
                {ITEM_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div>
              <label
                htmlFor="serialNumber"
                className="mb-1.5 block text-sm font-medium"
              >
                Serial Number
              </label>
              <FormInput
                id="serialNumber"
                name="serialNumber"
                defaultValue={item.serialNumber || ""}
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="mb-1.5 block text-sm font-medium"
              >
                Location / Shelf
              </label>
              <FormInput
                id="location"
                name="location"
                defaultValue={item.location || ""}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Pricing</h2>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            <div>
              <label
                htmlFor="estimatedValue"
                className="mb-1.5 block text-sm font-medium"
              >
                Estimated Value
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
                Asking Price
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
                Minimum Price
              </label>
              <FormInput
                id="minPrice"
                name="minPrice"
                defaultValue={item.minPrice || ""}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Notes</h2>
          </div>
          <div className="p-6">
            <FormTextarea
              name="notes"
              defaultValue={item.notes || ""}
              rows={4}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/intake/items/${itemId}`}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

interface RepairSectionProps {
  itemId: string;
  currentCost: string | null;
  currentHours: string | null;
  currentLog: string | null;
  onRecorded: (updated: {
    repairCost: string | null;
    repairHours: string | null;
    repairLog: string | null;
  }) => void;
}

function RepairSection({
  itemId,
  currentCost,
  currentHours,
  currentLog,
  onRecorded,
}: RepairSectionProps) {
  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

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
      // Compute new cumulative values client-side for instant UI update
      const newCost = (
        parseFloat(currentCost || "0") + parseFloat(cost)
      ).toFixed(2);
      const newHours = (
        parseFloat(currentHours || "0") + parseFloat(hours || "0")
      ).toFixed(2);
      const date = new Date().toISOString().split("T")[0];
      const entry = `${date} — CHF ${parseFloat(cost).toFixed(2)}${hours ? ` / ${hours}h` : ""}${note ? `: ${note}` : ""}`;
      const newLog = currentLog ? `${currentLog}\n${entry}` : entry;
      onRecorded({
        repairCost: newCost,
        repairHours: newHours,
        repairLog: newLog,
      });
      setCost("");
      setHours("");
      setNote("");
      toast.success("Repair recorded");
    } else {
      setRepairError(result.error || "Failed to record repair");
    }

    setIsRecording(false);
  }

  const totalCost = currentCost ? parseFloat(currentCost) : 0;
  const totalHours = currentHours ? parseFloat(currentHours) : 0;

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Repair Log</h2>
        {totalCost > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Total: CHF {totalCost.toFixed(2)}
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
                Cost (CHF) *
              </label>
              <FormInput
                type="text"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="40.00"
                pattern="\d+(\.\d{1,2})?"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Hours
              </label>
              <FormInput
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
                pattern="\d+(\.\d{1,2})?"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Note
              </label>
              <FormInput
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="replaced battery"
              />
            </div>
          </div>
          {repairError && (
            <p className="text-xs text-destructive">{repairError}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isRecording || !cost}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isRecording && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Repair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
