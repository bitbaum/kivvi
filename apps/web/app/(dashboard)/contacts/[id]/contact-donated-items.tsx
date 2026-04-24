import Link from "next/link";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listInventoryItems } from "@kivvi/core/src/domain/inventory-items";
import { db } from "@/lib/db";
import { CardSection } from "@/components/card-section";
import { StatusBadge } from "@/components/status-badge";
import {
  getConditionStyle,
  getConditionLabelKey,
  getStatusStyle,
  getStatusLabelKey,
} from "@/lib/config/inventory-items";

const PAGE_SIZE = 10;

interface ContactDonatedItemsProps {
  contactId: string;
  companyId: string;
}

export async function ContactDonatedItems({
  contactId,
  companyId,
}: ContactDonatedItemsProps) {
  const t = await getTranslations("contacts");
  const ti = await getTranslations("inventory");

  const result = await listInventoryItems(db, companyId, {
    donorContactId: contactId,
    pageSize: PAGE_SIZE,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (result.total === 0) return null;

  return (
    <CardSection
      title={t("donatedItemsTitle")}
      icon={<Package className="h-4 w-4 text-muted-foreground" />}
    >
      <ul className="space-y-2">
        {result.data.map((item) => (
          <li key={item.id}>
            <Link
              href={`/intake/items/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {item.itemNumber}
                </span>
                <span className="truncate">
                  {item.description || item.productName || "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.condition && (
                  <StatusBadge
                    status={item.condition}
                    label={ti(getConditionLabelKey(item.condition))}
                    styleMap={{}}
                    className={getConditionStyle(item.condition)}
                  />
                )}
                <StatusBadge
                  status={item.status}
                  label={ti(getStatusLabelKey(item.status))}
                  styleMap={{}}
                  className={getStatusStyle(item.status)}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {result.total > PAGE_SIZE && (
        <p className="mt-3 text-xs text-muted-foreground text-center border-t pt-3">
          {t("donatedItemsAndMore", { count: result.total - PAGE_SIZE })}
        </p>
      )}
    </CardSection>
  );
}
