import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/search-input";

interface ContactsFilterBarProps {
  search: string;
  typeFilter: string | undefined;
  sort: string;
  order: string;
  customerCount: number;
  vendorCount: number;
  newThisMonth: number;
}

export async function ContactsFilterBar({
  search,
  typeFilter,
  sort,
  order,
  customerCount,
  vendorCount,
  newThisMonth,
}: ContactsFilterBarProps) {
  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          basePath="/contacts"
          placeholder={t("searchContacts")}
          preserveParams={["type", "sort", "order"]}
        />

        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <TypeFilterLink
            label={tc("all")}
            value=""
            current={typeFilter}
            search={search}
            sort={sort}
            order={order}
          />
          <TypeFilterLink
            label={t("customer")}
            value="customer"
            current={typeFilter}
            search={search}
            sort={sort}
            order={order}
          />
          <TypeFilterLink
            label={t("vendor")}
            value="vendor"
            current={typeFilter}
            search={search}
            sort={sort}
            order={order}
          />
          <TypeFilterLink
            label={t("both")}
            value="both"
            current={typeFilter}
            search={search}
            sort={sort}
            order={order}
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-muted px-3 py-1 font-medium">
          {t("summaryCustomers", { count: customerCount })}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 font-medium">
          {t("summaryVendors", { count: vendorCount })}
        </span>
        {newThisMonth > 0 && (
          <span className="rounded-full bg-success/10 px-3 py-1 font-medium text-success">
            {t("summaryNewThisMonth", { count: newThisMonth })}
          </span>
        )}
      </div>
    </>
  );
}

function TypeFilterLink({
  label,
  value,
  current,
  search,
  sort,
  order,
}: {
  label: string;
  value: string;
  current?: string;
  search: string;
  sort: string;
  order: string;
}) {
  const isActive = (current || "") === value;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (value) params.set("type", value);
  if (sort !== "name") params.set("sort", sort);
  if (order !== "asc") params.set("order", order);
  const href = `/contacts${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
