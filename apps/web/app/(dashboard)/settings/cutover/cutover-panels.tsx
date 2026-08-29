"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { importOpeningBalancesAction, importOpenItemsAction } from "@/app/actions/cutover";
import { formatCurrency, cn } from "@/lib/utils";

type Recon = {
  imported: number;
  totalOpen: string;
  control: string;
  matches: boolean;
  delta: string;
};

export function CutoverPanels() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();

  const [obDate, setObDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [obText, setObText] = useState("");

  const [oiType, setOiType] = useState<"invoice" | "purchase_invoice">("invoice");
  const [oiText, setOiText] = useState("");
  const [recon, setRecon] = useState<Recon | null>(null);

  const submitOpening = () =>
    startTransition(async () => {
      const r = await importOpeningBalancesAction({
        date: obDate,
        text: obText,
      });
      if (r.success && r.data) {
        toast.success(t("cutover.openingDone", { count: r.data.lineCount }));
      } else {
        toast.error(r.error || tc("error"));
      }
    });

  const submitOpenItems = () =>
    startTransition(async () => {
      const r = await importOpenItemsAction({ type: oiType, text: oiText });
      if (r.success && r.data) {
        setRecon(r.data);
        toast.success(t("cutover.openItemsDone", { count: r.data.imported }));
      } else {
        toast.error(r.error || tc("error"));
      }
    });

  const textareaCls =
    "w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-10">
      {/* Opening balances */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("cutover.openingTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("cutover.openingHint")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("cutover.date")}
            </label>
            <input
              type="date"
              value={obDate}
              onChange={(e) => setObDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <textarea
          rows={6}
          value={obText}
          onChange={(e) => setObText(e.target.value)}
          placeholder={"1020;13760.15;\n1100;21642.50;\n2000;;15300.00"}
          className={textareaCls}
        />
        <p className="text-xs text-muted-foreground">{t("cutover.formatOpening")}</p>
        <button
          onClick={submitOpening}
          disabled={pending || !obText.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? tc("loading") : t("cutover.importOpening")}
        </button>
      </section>

      {/* Open items */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("cutover.openItemsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("cutover.openItemsHint")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1 w-fit">
          {(["invoice", "purchase_invoice"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setOiType(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                oiType === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "invoice" ? t("cutover.receivables") : t("cutover.payables")}
            </button>
          ))}
        </div>
        <textarea
          rows={6}
          value={oiText}
          onChange={(e) => setOiText(e.target.value)}
          placeholder={
            "R2023036;Abevi Emile;31.01.2023;28.02.2023;50.00\nR2019333;Aebi Christine;13.08.2019;13.08.2019;45.00"
          }
          className={textareaCls}
        />
        <p className="text-xs text-muted-foreground">{t("cutover.formatOpenItems")}</p>
        <button
          onClick={submitOpenItems}
          disabled={pending || !oiText.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? tc("loading") : t("cutover.importOpenItems")}
        </button>

        {recon && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-sm",
              recon.matches
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            {recon.matches ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            )}
            <div className="space-y-1">
              <p className="font-medium">
                {recon.matches ? t("cutover.reconciled") : t("cutover.mismatch")}
              </p>
              <p className="text-muted-foreground">
                {t("cutover.reconLine", {
                  open: formatCurrency(recon.totalOpen),
                  control: formatCurrency(recon.control),
                  delta: formatCurrency(recon.delta),
                })}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
