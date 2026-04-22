"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Common specs by category hint — shown as placeholders when the field is empty
const COMMON_SPECS = [
  "CPU",
  "RAM",
  "Storage",
  "Battery",
  "OS",
  "Display",
  "GPU",
  "Frame Size",
  "Gears",
  "Mileage",
  "Year",
  "Color",
];

interface SpecRow {
  key: string;
  value: string;
}

interface ItemSpecsEditorProps {
  initialSpecs?: Record<string, string> | null;
  /** Name of the hidden input that receives the JSON string */
  inputName?: string;
}

export function ItemSpecsEditor({
  initialSpecs,
  inputName = "specs",
}: ItemSpecsEditorProps) {
  const t = useTranslations("inventory");
  const [rows, setRows] = useState<SpecRow[]>(() => {
    if (!initialSpecs || Object.keys(initialSpecs).length === 0) return [];
    return Object.entries(initialSpecs).map(([key, value]) => ({ key, value }));
  });

  const addRow = () => setRows((prev) => [...prev, { key: "", value: "" }]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: "key" | "value", val: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    );

  // Serialize non-empty rows to JSON for form submission
  const specsJson = JSON.stringify(
    Object.fromEntries(
      rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]),
    ),
  );

  return (
    <div className="space-y-2">
      <input type="hidden" name={inputName} value={specsJson} />

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                onChange={(e) => updateRow(idx, "key", e.target.value)}
                placeholder={COMMON_SPECS[idx % COMMON_SPECS.length]}
                className="w-36 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-muted-foreground">:</span>
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateRow(idx, "value", e.target.value)}
                placeholder={t("specValue")}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addSpec")}
      </button>
    </div>
  );
}
