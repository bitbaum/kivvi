import { redirect } from "next/navigation";

// Sales documents live in the unified documents hub with type filtering
export default function SalesPage() {
  redirect("/documents?type=invoice");
}
