import { PackageOpen, Wrench, CheckCircle2, ShoppingCart, ShieldCheck } from "lucide-react";
import Decimal from "decimal.js";
import { formatDate, formatCurrency } from "@/lib/utils";

interface RepairEntry {
  date: string;
  cost: string;
  hours: string;
  note: string;
}

function parseRepairLog(log: string): RepairEntry[] {
  return log
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Format: "YYYY-MM-DD — CHF X.XX[/ Yh][: note]"
      // or (client-preview format): "YYYY-MM-DD — X.XX[/ Yh][: note]"
      const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s*—\s*/);
      if (!dateMatch) return { date: "", cost: "", hours: "", note: line };

      const date = dateMatch[1];
      const rest = line.slice(dateMatch[0].length);

      // Extract cost (with or without "CHF")
      const costMatch = rest.match(/^(?:CHF\s*)?(\d+(?:\.\d+)?)/);
      const cost = costMatch ? costMatch[1] : "";
      let remaining = rest.slice(costMatch ? costMatch[0].length : 0).trim();

      // Extract hours: "/ 2h" or "/ 2.5h"
      const hoursMatch = remaining.match(/^\s*\/\s*(\d+(?:\.\d+)?)h/);
      const hours = hoursMatch ? hoursMatch[1] : "";
      remaining = remaining.slice(hoursMatch ? hoursMatch[0].length : 0).trim();

      // Extract note: ": note text"
      const note = remaining.startsWith(":") ? remaining.slice(1).trim() : remaining;

      return { date, cost, hours, note };
    });
}

interface ItemTimelineLabels {
  intake: string;
  from: string;
  repair: string;
  ready: string;
  condition: string;
  invested: string;
  erasure: string;
  sold: string;
}

interface ItemTimelineProps {
  createdAt: Date | string;
  donorName?: string | null;
  repairLog?: string | null;
  repairCost?: string | null;
  status: string;
  soldPrice?: string | null;
  condition: string;
  conditionLabel: string;
  dataErasuredAt?: Date | string | null;
  dataErasureMethod?: string | null;
  /** Translated label for the erasure method value (resolved by caller) */
  erasureMethodLabel?: string | null;
  labels: ItemTimelineLabels;
}

export function ItemTimeline({
  createdAt,
  donorName,
  repairLog,
  repairCost,
  status,
  soldPrice,
  conditionLabel,
  dataErasuredAt,
  dataErasureMethod,
  erasureMethodLabel,
  labels,
}: ItemTimelineProps) {
  const repairs = repairLog ? parseRepairLog(repairLog) : [];
  const isSold = status === "sold" || !!soldPrice;
  const totalCost = new Decimal(repairCost ?? "0");

  const events = [
    {
      type: "intake" as const,
      date: typeof createdAt === "string" ? createdAt : createdAt.toISOString(),
      donorName,
    },
    ...repairs.map((r) => ({ type: "repair" as const, ...r })),
    ...(dataErasuredAt
      ? [
          {
            type: "erasure" as const,
            date:
              typeof dataErasuredAt === "string" ? dataErasuredAt : dataErasuredAt.toISOString(),
            method: dataErasureMethod ?? null,
          },
        ]
      : []),
    ...(isSold
      ? [{ type: "sold" as const, price: soldPrice || "", date: "" }]
      : status === "ready_for_sale"
        ? [{ type: "ready" as const, date: "", conditionLabel }]
        : []),
  ];

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-5 bottom-5 w-px bg-border" />

      {events.map((event, idx) => (
        <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Icon */}
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            {event.type === "intake" && <PackageOpen className="h-3.5 w-3.5 text-info" />}
            {event.type === "repair" && <Wrench className="h-3.5 w-3.5 text-warning" />}
            {event.type === "ready" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
            {event.type === "erasure" && <ShieldCheck className="h-3.5 w-3.5 text-info" />}
            {event.type === "sold" && <ShoppingCart className="h-3.5 w-3.5 text-success" />}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1">
            {event.type === "intake" && (
              <>
                <p className="text-sm font-medium">{labels.intake}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.date)}
                  {event.donorName && ` · ${labels.from} ${event.donorName}`}
                </p>
              </>
            )}
            {event.type === "repair" && (
              <>
                <p className="text-sm font-medium">
                  {labels.repair}
                  {event.cost && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatCurrency(event.cost)}
                      {event.hours && ` · ${event.hours}h`}
                    </span>
                  )}
                </p>
                {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                {event.date && <p className="text-xs text-muted-foreground">{event.date}</p>}
              </>
            )}
            {event.type === "ready" && (
              <>
                <p className="text-sm font-medium text-success">{labels.ready}</p>
                <p className="text-xs text-muted-foreground">
                  {labels.condition}: {event.conditionLabel}
                  {totalCost.gt(0) &&
                    ` · ${formatCurrency(totalCost.toFixed(2))} ${labels.invested}`}
                </p>
              </>
            )}
            {event.type === "erasure" && (
              <>
                <p className="text-sm font-medium">{labels.erasure}</p>
                <p className="text-xs text-muted-foreground">
                  {erasureMethodLabel ?? event.method}
                  {event.date && ` · ${formatDate(event.date)}`}
                </p>
              </>
            )}
            {event.type === "sold" && (
              <>
                <p className="text-sm font-medium text-success">{labels.sold}</p>
                {event.price && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(event.price)}</p>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
