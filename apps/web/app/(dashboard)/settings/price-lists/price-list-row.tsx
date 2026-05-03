"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import type { PriceList } from "@kivvi/database";

interface Props {
  list: PriceList;
  defaultBadge: string;
}

export function PriceListRow({ list, defaultBadge }: Props) {
  return (
    <Link
      href={`/settings/price-lists/${list.id}`}
      className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 font-medium">
        {list.name}
        {list.isDefault && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Star className="h-3 w-3" />
            {defaultBadge}
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{list.currency}</div>
      <div className="text-sm text-muted-foreground">—</div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
