import { redirect } from "next/navigation";

// Purchasing documents live in the unified documents hub with type filtering
export default function PurchasingPage() {
  redirect("/documents?type=purchase_invoice");
}
