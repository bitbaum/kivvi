import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listWarehouses } from "@kivvi/core";
import { PageHeader } from "@/components/page-header";
import { InventoryImportPanel } from "./inventory-import-panel";

export default async function InventoryImportPage() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventoryImport");

  const warehouses = await listWarehouses(db, session.user.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={ti("title")}
        subtitle={ti("subtitle")}
        actions={
          <Link
            href="/intake/items"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {ti("backToItems")}
          </Link>
        }
      />

      <InventoryImportPanel
        warehouses={warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          isDefault: w.isDefault,
        }))}
      />
    </div>
  );
}
