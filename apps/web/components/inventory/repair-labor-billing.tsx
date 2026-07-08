"use client";

import Decimal from "decimal.js";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { FormInput } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createRepairLaborInvoiceAction } from "@/app/actions/documents";
import { formatCurrency } from "@/lib/utils";

interface RepairLaborBillingProps {
  itemId: string;
  totalHours: string;
  defaultHourlyRate?: string;
}

export function RepairLaborBilling({
  itemId,
  totalHours,
  defaultHourlyRate,
}: RepairLaborBillingProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<{
    id: string;
    number: string;
  } | null>(null);

  const hours = new Decimal(totalHours);
  const amount =
    hourlyRate && hours.gt(0) ? hours.times(hourlyRate).toFixed(2) : null;

  async function handleCreate() {
    if (!contactId) return;
    setIsCreating(true);
    setError(null);

    const result = await createRepairLaborInvoiceAction({
      itemId,
      contactId,
      // Omit when empty so the domain falls back to the company default rate.
      ...(hourlyRate ? { hourlyRate } : {}),
    });

    if (result.success && result.data) {
      setCreatedInvoice(result.data);
      toast.success(ti("repairLaborInvoiceCreated"));
    } else {
      setError(result.error || tc("error"));
    }

    setIsCreating(false);
  }

  if (createdInvoice) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
        <p className="font-medium text-success">
          {ti("repairLaborInvoiceCreated")}
        </p>
        <p className="mt-1 text-muted-foreground">
          {ti("repairLaborInvoiceDraft", { number: createdInvoice.number })}
        </p>
        <Link
          href={`/invoices/${createdInvoice.id}`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          {ti("viewRepairLaborInvoice")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-4">
      <div>
        <p className="text-sm font-medium">{ti("repairLaborBillingTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {ti("repairLaborBillingPrompt", {
            hours: totalHours,
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactPicker
          value={contactId}
          displayValue={contactName}
          onChange={(id, name) => {
            setContactId(id);
            setContactName(name);
          }}
          contactType="customer"
        />
        <div>
          <label
            htmlFor="repair-hourly-rate"
            className="mb-1 block text-sm font-medium"
          >
            {ti("hourlyRate")}
          </label>
          <FormInput
            id="repair-hourly-rate"
            type="text"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="95.00"
          />
        </div>
      </div>

      {amount && (
        <p className="text-sm text-muted-foreground">
          {ti("repairLaborAmountPreview", {
            amount: formatCurrency(amount),
          })}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !contactId}
        >
          {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
          {ti("createRepairLaborInvoice")}
        </Button>
      </div>
    </div>
  );
}
