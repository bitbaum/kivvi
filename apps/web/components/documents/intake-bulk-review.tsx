"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ExtractedItem } from "@/app/actions/ai-extract";
import {
  ITEM_CATEGORIES,
  getChecklistTemplate,
} from "@kivvi/core/src/config/checklist-templates";

interface ReviewItem extends ExtractedItem {
  _id: string;
}

interface IntakeBulkReviewProps {
  items: ExtractedItem[];
  onConfirm: (items: ExtractedItem[]) => void;
  onBack: () => void;
}

type EditingCell = { id: string; field: keyof ExtractedItem } | null;

export function IntakeBulkReview({
  items: initial,
  onConfirm,
  onBack,
}: IntakeBulkReviewProps) {
  const tb = useTranslations("documents.bulkReview");
  const tck = useTranslations("checklist");
  const [rows, setRows] = useState<ReviewItem[]>(() =>
    initial.map((item) => ({ ...item, _id: crypto.randomUUID() })),
  );
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: string, field: keyof ExtractedItem, value: string) => {
    setEditing({ id, field });
    setEditValue(value);
  };

  const commitEdit = () => {
    if (!editing) return;
    setRows((prev) =>
      prev.map((r) =>
        r._id === editing.id
          ? {
              ...r,
              [editing.field]: editValue,
              // keep description in sync when brand/model changes
              description:
                editing.field === "brand"
                  ? [editValue, r.model].filter(Boolean).join(" ")
                  : editing.field === "model"
                    ? [r.brand, editValue].filter(Boolean).join(" ")
                    : r.description,
            }
          : r,
      ),
    );
    setEditing(null);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        brand: "",
        model: "",
        description: "",
        quantity: "1",
        category: "other",
        estimatedPrice: "",
      },
    ]);
  };

  const handleConfirm = () => {
    const valid = rows.filter(
      (r) => r.model.trim() || r.brand.trim() || r.description.trim(),
    );
    onConfirm(valid);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium w-8">#</th>
              <th className="px-3 py-2 text-left font-medium">
                {tb("colManufacturer")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {tb("colModelDesc")}
              </th>
              <th className="px-3 py-2 text-left font-medium w-16">
                {tb("colQty")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {tb("colCategory")}
              </th>
              <th className="px-3 py-2 text-left font-medium w-24">
                {tb("colPrice")}
              </th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => (
              <tr key={row._id} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <EditCell
                  id={row._id}
                  field="brand"
                  value={row.brand}
                  editing={editing}
                  editValue={editValue}
                  onStart={startEdit}
                  onCommit={commitEdit}
                  onEditValue={setEditValue}
                  placeholder={tb("placeholderBrand")}
                />
                <EditCell
                  id={row._id}
                  field="model"
                  value={row.model}
                  editing={editing}
                  editValue={editValue}
                  onStart={startEdit}
                  onCommit={commitEdit}
                  onEditValue={setEditValue}
                  placeholder={tb("placeholderModel")}
                />
                <EditCell
                  id={row._id}
                  field="quantity"
                  value={row.quantity}
                  editing={editing}
                  editValue={editValue}
                  onStart={startEdit}
                  onCommit={commitEdit}
                  onEditValue={setEditValue}
                  inputType="number"
                />
                <td className="px-3 py-2">
                  <select
                    value={row.category}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r._id === row._id
                            ? { ...r, category: e.target.value }
                            : r,
                        ),
                      )
                    }
                    className="w-full rounded border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    {ITEM_CATEGORIES.map((v) => (
                      <option key={v} value={v}>
                        {tck(
                          getChecklistTemplate(v).labelKey as Parameters<
                            typeof tck
                          >[0],
                        )}
                      </option>
                    ))}
                  </select>
                </td>
                <EditCell
                  id={row._id}
                  field="estimatedPrice"
                  value={row.estimatedPrice}
                  editing={editing}
                  editValue={editValue}
                  onStart={startEdit}
                  onCommit={commitEdit}
                  onEditValue={setEditValue}
                  inputType="number"
                  placeholder="0"
                />
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(row._id)}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          {tb("addRow")}
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tb("back")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {tb("confirmItems", { count: rows.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCell({
  id,
  field,
  value,
  editing,
  editValue,
  onStart,
  onCommit,
  onEditValue,
  inputType = "text",
  placeholder = "",
}: {
  id: string;
  field: keyof ExtractedItem;
  value: string;
  editing: EditingCell;
  editValue: string;
  onStart: (id: string, field: keyof ExtractedItem, value: string) => void;
  onCommit: () => void;
  onEditValue: (v: string) => void;
  inputType?: string;
  placeholder?: string;
}) {
  const isEditing = editing?.id === id && editing?.field === field;

  if (isEditing) {
    return (
      <td className="px-3 py-1">
        <input
          autoFocus
          type={inputType}
          value={editValue}
          onChange={(e) => onEditValue(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              onCommit();
            }
            if (e.key === "Escape") {
              onCommit();
            }
          }}
          className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </td>
    );
  }

  return (
    <td
      className="cursor-text px-3 py-2 hover:bg-muted/50"
      onClick={() => onStart(id, field, value)}
    >
      {value || <span className="text-muted-foreground/50">{placeholder}</span>}
    </td>
  );
}
