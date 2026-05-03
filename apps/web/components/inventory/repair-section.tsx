"use client";

import Decimal from "decimal.js";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordRepairAction } from "@/app/actions/inventory-items";
import { formatCurrency } from "@/lib/utils";

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

export function RepairSection({
  itemId,
  currentCost,
  currentHours,
  currentLog,
  onRecorded,
}: RepairSectionProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);

  const totalCost = new Decimal(currentCost ?? "0");
  const totalHours = new Decimal(currentHours ?? "0");

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!cost) return;
    setIsRecording(true);
    setRepairError(null);

    const result = await recordRepairAction({
      itemId,
      input: { cost, hours: hours || undefined, note: note || undefined },
    });

    if (result.success) {
      const newCost = totalCost.plus(cost).toDecimalPlaces(2).toString();
      const newHours = totalHours
        .plus(hours || "0")
        .toDecimalPlaces(2)
        .toString();
      const date = new Date().toISOString().split("T")[0];
      const entry = `${date} — ${new Decimal(cost).toDecimalPlaces(2)}${hours ? ` / ${hours}h` : ""}${note ? `: ${note}` : ""}`;
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
      setRepairError(result.error || tc("error"));
    }

    setIsRecording(false);
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{ti("repairLog")}</h2>
        {totalCost.gt(0) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {tc("total")}: {formatCurrency(totalCost.toFixed(2))}
            {totalHours.gt(0) && ` · ${totalHours}h`}
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
              <label
                htmlFor="repair-cost"
                className="mb-1 block text-sm font-medium text-muted-foreground"
              >
                {ti("costField")} *
              </label>
              <FormInput
                id="repair-cost"
                type="text"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="40.00"
                required
              />
            </div>
            <div>
              <label
                htmlFor="repair-hours"
                className="mb-1 block text-sm font-medium text-muted-foreground"
              >
                {ti("hours")}
              </label>
              <FormInput
                id="repair-hours"
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
              />
            </div>
            <div>
              <label
                htmlFor="repair-note"
                className="mb-1 block text-sm font-medium text-muted-foreground"
              >
                {ti("note")}
              </label>
              <FormInput
                id="repair-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          {repairError && (
            <p role="alert" className="text-sm text-destructive">
              {repairError}
            </p>
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
