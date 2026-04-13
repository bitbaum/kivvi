import { redirect } from "next/navigation";

// Outbound invoices are at /sales/invoices
export default function InvoicesPage() {
  redirect("/sales/invoices");
}
