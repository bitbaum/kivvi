import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Receipt, FileText, Warehouse } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getProduct } from "@kivvi/core";
import { isValidUUID } from "@/lib/utils";
import { deleteProductAction } from "@/app/actions/products";
import { QuickActionsBar, type QuickAction } from "@/components/quick-actions-bar";
import { StatusBadge } from "@/components/status-badge";
import { ProductDetailMain } from "./product-detail-main";
import { ProductDetailSidebar } from "./product-detail-sidebar";
import { RecentItemTracker } from "@/components/recent-item-tracker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("products");
  const tc = await getTranslations("common");

  const { id } = await params;
  if (!isValidUUID(id)) notFound();
  const product = await getProduct(db, session.user.companyId, id);
  if (!product) notFound();

  const quickActions: QuickAction[] = [
    {
      label: t("createQuote"),
      href: `/sales/quotes/new`,
      icon: <Receipt className="h-4 w-4" />,
      variant: "primary",
    },
    {
      label: t("createInvoice"),
      href: `/sales/invoices/new`,
      icon: <FileText className="h-4 w-4" />,
    },
  ];
  if (product.type === "product") {
    quickActions.push({
      label: t("adjustStock"),
      href: `/inventory`,
      icon: <Warehouse className="h-4 w-4" />,
    });
  }

  return (
    <div className="space-y-6">
      <RecentItemTracker
        id={product.id}
        type="product"
        label={product.name}
        href={`/products/${product.id}`}
      />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/products"
            className="mt-1 min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <StatusBadge
                variant={product.isActive ? "active" : "inactive"}
                label={product.isActive ? tc("active") : tc("inactive")}
              />
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono">{product.articleNumber}</span>
              {product.sku && (
                <>
                  <span>-</span>
                  <span>
                    {t("sku")}: {product.sku}
                  </span>
                </>
              )}
              {product.ean && (
                <>
                  <span>-</span>
                  <span>
                    {t("ean")}: {product.ean}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
            {tc("edit")}
          </Link>
          <DeleteButton
            productId={product.id}
            productName={product.name}
            deleteLabel={tc("delete")}
          />
        </div>
      </div>

      <QuickActionsBar actions={quickActions} />

      <div className="grid gap-6 lg:grid-cols-3">
        <ProductDetailMain product={product} />
        <ProductDetailSidebar product={product} />
      </div>
    </div>
  );
}

function DeleteButton({
  productId,
  productName,
  deleteLabel,
}: {
  productId: string;
  productName: string;
  deleteLabel: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        const result = await deleteProductAction(productId);
        if (result.success) {
          redirect("/products");
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        title={`${deleteLabel} ${productName}`}
      >
        <Trash2 className="h-4 w-4" />
        {deleteLabel}
      </button>
    </form>
  );
}
