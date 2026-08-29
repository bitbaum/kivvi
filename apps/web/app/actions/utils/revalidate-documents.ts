import { revalidatePath } from "next/cache";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

const TYPE_TO_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES).map(([type, config]) => [type, config.basePath]),
);

export function revalidateDocumentPaths(type: string, id?: string) {
  const basePath = TYPE_TO_PATH[type] || "/sales/invoices";
  revalidatePath(basePath);
  if (id) revalidatePath(`${basePath}/${id}`);
  revalidatePath("/dashboard");
}
