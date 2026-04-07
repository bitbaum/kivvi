"use client";

import { FileText, User, Package, ArrowRight } from "lucide-react";
import type { CommandBarToolResult } from "@/hooks/use-command-bar-ai";

interface ActionPreviewCardProps {
  toolResult: CommandBarToolResult;
}

export function ActionPreviewCard({ toolResult }: ActionPreviewCardProps) {
  const { result } = toolResult;
  if (!result.success || !result.data) return null;

  const data = result.data as Record<string, unknown>;

  // Document preview (from prepare_document or create_document)
  if (data.type && data.total) {
    const items = (data.items as Array<Record<string, unknown>>) || [];
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium">{String(data.type)}</span>
          {data.contact ? (
            <>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {String(data.contact)}
              </span>
            </>
          ) : null}
        </div>
        {items.length > 0 && (
          <div className="mb-2 space-y-1 text-xs text-muted-foreground">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate">{String(item.description)}</span>
                <span className="ml-2 shrink-0 tabular-nums">
                  {String(item.quantity)}x {String(item.unitPrice)}
                </span>
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-muted-foreground/60">
                +{items.length - 3} more...
              </div>
            )}
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-2 text-xs">
          {data.subtotal ? (
            <span className="text-muted-foreground">
              Net: {String(data.subtotal)}
            </span>
          ) : null}
          <span className="font-medium">{String(data.total)}</span>
        </div>
      </div>
    );
  }

  // Contact preview
  if (data.name && data.contactNumber) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <User className="h-4 w-4 text-primary" />
        <span className="font-medium">{String(data.name)}</span>
        <span className="text-xs text-muted-foreground">
          {String(data.contactNumber)}
        </span>
      </div>
    );
  }

  // Product preview
  if (data.name && data.articleNumber) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <Package className="h-4 w-4 text-primary" />
        <span className="font-medium">{String(data.name)}</span>
        <span className="text-xs text-muted-foreground">
          {String(data.articleNumber)}
        </span>
      </div>
    );
  }

  return null;
}
