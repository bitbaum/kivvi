"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { createRepairIntakeAction } from "@/app/actions/repairs";
import { SUBSIDY_PROGRAMS } from "@kivvi/core/src/config/subsidy-programs";

const PROGRAMS = Object.entries(SUBSIDY_PROGRAMS).map(([key, p]) => ({
  key,
  label: p.label,
}));

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelCls = "mb-1 block text-xs font-medium text-muted-foreground";

export function RepairIntakeForm() {
  const t = useTranslations("repairs");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [contactId, setContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [device, setDevice] = useState("");
  const [fault, setFault] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [vatRate, setVatRate] = useState("8.1");
  const [advance, setAdvance] = useState("");
  const [programKey, setProgramKey] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");

  const submit = () => {
    if (!contactId && !contactName.trim()) {
      toast.error(t("customerRequired"));
      return;
    }
    if (!device.trim() && !fault.trim()) {
      toast.error(t("deviceOrFaultRequired"));
      return;
    }
    startTransition(async () => {
      const r = await createRepairIntakeAction({
        contactId: contactId ?? undefined,
        contactName: contactId ? undefined : contactName.trim() || undefined,
        deviceInfo: device.trim() || undefined,
        faultDescription: fault.trim() || undefined,
        quotedAmount: basePrice.trim() || undefined,
        vatRate: vatRate.trim() || undefined,
        advanceAmount: advance.trim() || undefined,
        subsidyProgramKey: programKey || undefined,
        subsidyCode: code.trim() || undefined,
        category: category.trim() || undefined,
      });
      if (r.success && r.data) {
        toast.success(t("created", { number: r.data.number }));
        if (r.data.subsidyApplied && Number(r.data.subsidyApplied) > 0) {
          toast.success(t("subsidyApplied", { amount: r.data.subsidyApplied }));
        }
        router.push(`/repairs/${r.data.id}`);
      } else {
        toast.error(r.error || t("submitError"));
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <span className={labelCls}>{t("customer")}</span>
          <ContactPicker
            value={contactId}
            displayValue={contactName}
            onChange={(id, name) => {
              setContactId(id);
              setContactName(name);
            }}
            contactType="customer"
            allowQuickCreate
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("device")}</label>
            <input
              className={inputCls}
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder={t("devicePlaceholder")}
            />
          </div>
          <div>
            <label className={labelCls}>{t("category")}</label>
            <input
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("categoryPlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t("fault")}</label>
          <textarea
            rows={3}
            className={inputCls}
            value={fault}
            onChange={(e) => setFault(e.target.value)}
            placeholder={t("faultPlaceholder")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>{t("basePrice")}</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="30.00"
            />
          </div>
          <div>
            <label className={labelCls}>{t("vatRate")}</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>{t("advance")}</label>
            <input
              className={inputCls}
              inputMode="decimal"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("advanceHint")}</p>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold">{t("subsidyTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{t("program")}</label>
            <select
              className={inputCls}
              value={programKey}
              onChange={(e) => setProgramKey(e.target.value)}
            >
              <option value="">{t("programNone")}</option>
              {PROGRAMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {programKey && (
            <div>
              <label className={labelCls}>{t("bonusCode")}</label>
              <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {tc("cancel")}
        </button>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? tc("loading") : t("submit")}
        </button>
      </div>
    </div>
  );
}
