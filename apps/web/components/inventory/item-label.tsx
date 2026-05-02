/**
 * Printable label for a single inventory item.
 * Designed for standard label sheets (Avery L7160: 63.5mm × 38.1mm, 21/page).
 * Server component — QR code generated server-side.
 */
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { formatCurrency } from "@/lib/utils";

interface ItemLabelProps {
  itemNumber: string;
  description: string;
  condition: string;
  qrDataUrl: string;
  askingPrice?: string | null;
  currency?: string;
}

const CONDITION_SHORT: Record<string, string> = {
  untested: "?",
  like_new: "A+",
  good: "A",
  fair: "B",
  poor: "C",
  parts_only: "P",
  scrap: "X",
};

export function ItemLabel({
  itemNumber,
  description,
  condition,
  qrDataUrl,
  askingPrice,
  currency = DEFAULT_CURRENCY,
}: ItemLabelProps) {
  const priceText =
    askingPrice && Number(askingPrice) > 0
      ? formatCurrency(askingPrice, currency)
      : null;
  return (
    <div
      className="flex items-center gap-2 border border-gray-300 p-2"
      style={{ width: "63.5mm", height: "38.1mm", pageBreakInside: "avoid" }}
    >
      {/* QR code */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt={`QR: ${itemNumber}`}
        className="h-[30mm] w-[30mm] shrink-0"
      />

      {/* Text info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="text-[11pt] font-bold leading-tight">
            {itemNumber}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[7pt] leading-tight text-gray-700">
            {description}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="inline-block rounded border px-1 py-0.5 text-[7pt] font-bold">
            {CONDITION_SHORT[condition] || condition}
          </span>
          {priceText && (
            <span className="text-[8pt] font-bold tabular-nums">
              {priceText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
