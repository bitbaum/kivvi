"use client";

import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SortableLineItem } from "./sortable-line-item";
import type { LineItem } from "./document-form";

interface LineItemsEditorProps {
  items: LineItem[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof LineItem, value: string | null) => void;
  onRemoveItem: (id: string) => void;
  hideFinancials?: boolean;
  priceLabel?: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}

export function LineItemsEditor({
  items,
  sensors,
  onDragEnd,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  hideFinancials,
  priceLabel,
  t,
  tc,
}: LineItemsEditorProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">{t("lineItems")}</h2>
        <Button type="button" variant="link" size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4" />
          {t("addItem")}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {items.map((item, index) => (
              <SortableLineItem
                key={item.id}
                item={item}
                index={index}
                updateItem={(id, field, value) => onUpdateItem(id, field, value)}
                removeItem={onRemoveItem}
                canRemove={items.length > 1}
                hideFinancials={hideFinancials}
                priceLabel={priceLabel}
                t={t}
                tc={tc}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
