import Link from "next/link";
import { Plus, Users, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { paginationRange } from "@/lib/utils";
import { listContacts } from "@kivvi/core";
import { getContactStats } from "@kivvi/core/src/domain/contacts";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/document-types";
import { getContactTypeLabels } from "@/lib/config/contact-types";
import { PageHeader } from "@/components/page-header";
import { SelectableContactTable } from "@/components/contacts/selectable-contact-table";
import { Pagination } from "@/components/pagination";
import { ContactExportButton } from "@/components/contacts/contact-export-button";
import { ContactsFilterBar } from "./contacts-filter-bar";

interface ContactsPageProps {
  searchParams: {
    search?: string;
    type?: string;
    page?: string;
    sort?: string;
    order?: string;
  };
}

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");
  const tb = await getTranslations("bulkActions");

  const companyId = session.user.companyId;
  const search = searchParams.search || "";
  const typeFilter = searchParams.type as
    | "customer"
    | "vendor"
    | "both"
    | undefined;
  const page = parseInt(searchParams.page || "1", 10);
  const sort = (searchParams.sort || "name") as
    | "name"
    | "contactNumber"
    | "createdAt"
    | "city";
  const order = (searchParams.order || "asc") as "asc" | "desc";

  const [result, { customerCount, vendorCount, newThisMonth }] =
    await Promise.all([
      listContacts(db, companyId, {
        search: search || undefined,
        type: typeFilter || undefined,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        sortBy: sort,
        sortOrder: order,
      }),
      getContactStats(db, companyId),
    ]);

  // Pre-resolve translations for client component
  const bulkActionKeys = [
    "selected",
    "clearSelection",
    "delete",
    "deactivate",
    "confirmTitle",
    "confirmDelete",
    "confirmDeactivate",
    "cancel",
    "processing",
    "confirmAction",
    "successAll",
    "successPartial",
    "failedAll",
    "showErrors",
    "hideErrors",
  ];
  // Keys with ICU placeholders ({count}, {successCount}, etc.) must use
  // tb.raw() to avoid ICU parser errors — the client fills them via .replace()
  const rawKeys = new Set([
    "successAll",
    "successPartial",
    "failedAll",
    "confirmDelete",
    "confirmDeactivate",
    "confirmMessage",
  ]);
  const bulkLabels: Record<string, string> = {};
  for (const key of bulkActionKeys) {
    bulkLabels[key] = rawKeys.has(key) ? tb.raw(key) : tb(key);
  }

  const columnLabels = {
    number: tc("number"),
    name: tc("name"),
    type: tc("type"),
    email: tc("email"),
    phone: tc("phone"),
    city: t("city"),
    lastDocument: t("lastDocument"),
    status: tc("status"),
    active: tc("active"),
    inactive: tc("inactive"),
  };

  const typeLabels = getContactTypeLabels(t);

  const quickActionLabels = {
    ariaLabel: tc("actions"),
    createInvoice: t("createInvoice"),
    createQuote: t("createQuote"),
    createOrder: t("createOrder"),
    createPurchaseOrder: t("createPurchaseOrder"),
    createPurchaseInvoice: t("createPurchaseInvoice"),
    sendEmail: t("sendEmail"),
    view: tc("view"),
    edit: tc("edit"),
  };

  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (sort !== "name") params.set("sort", sort);
    if (order !== "asc") params.set("order", order);
    if (p > 1) params.set("page", p.toString());
    return `/contacts${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function buildSortUrl(s: string, o: "asc" | "desc"): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("sort", s);
    params.set("order", o);
    return `/contacts?${params.toString()}`;
  }

  // Pre-compute sort hrefs for client component (functions can't cross server→client boundary)
  const sortHrefs: Record<string, string> = {};
  for (const field of ["contactNumber", "name", "city"]) {
    const nextOrder = sort === field && order === "asc" ? "desc" : "asc";
    sortHrefs[field] = buildSortUrl(field, nextOrder);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <ContactExportButton
              totalCount={result.total}
              filters={{ search: search || undefined, type: typeFilter }}
            />
            <Link
              href="/contacts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("newContact")}
            </Link>
          </>
        }
      />

      <ContactsFilterBar
        search={search}
        typeFilter={typeFilter}
        sort={sort}
        order={order}
        customerCount={customerCount}
        vendorCount={vendorCount}
        newThisMonth={newThisMonth}
      />

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {result.data.length === 0 ? (
          <EmptyState
            icon={search ? Search : Users}
            title={search ? tc("noResults") : t("noContacts")}
            description={search ? tc("noResults") : t("createFirstContact")}
            actionLabel={!search ? t("newContact") : undefined}
            actionHref={!search ? "/contacts/new" : undefined}
          />
        ) : (
          <>
            <SelectableContactTable
              data={result.data.map((c) => ({
                id: c.id,
                contactNumber: c.contactNumber,
                name: c.name,
                firstName: c.firstName,
                lastName: c.lastName,
                type: c.type,
                email: c.email,
                phone: c.phone,
                mobile: c.mobile,
                city: c.city,
                isActive: c.isActive,
                lastDocumentAt: c.lastDocumentAt,
              }))}
              translations={{
                columnLabels,
                typeLabels,
                bulkLabels,
                quickActionLabels,
              }}
              sort={{ field: sort, order, hrefs: sortHrefs }}
            />

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              buildHref={buildPageUrl}
              labels={{
                showing: tc(
                  "showing",
                  paginationRange(result.page, result.pageSize, result.total),
                ),
                previous: tc("previous"),
                next: tc("next"),
                pageOf: tc("pageOf", {
                  page: result.page,
                  totalPages: result.totalPages,
                }),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
