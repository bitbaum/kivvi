import { getTranslations } from "next-intl/server";
import { STATUS_STYLES, toCamelCase } from "@/lib/config/document-types";
import { cn } from "@/lib/utils";

export async function StatusBadge({
  status,
  isOverdue,
  size = "sm",
}: {
  status: string;
  isOverdue?: boolean;
  size?: "sm" | "md";
}) {
  const t = await getTranslations("status");
  const displayStatus = isOverdue && status !== "overdue" ? "overdue" : status;
  const sizeClasses = size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-block rounded-full font-medium",
        sizeClasses,
        STATUS_STYLES[displayStatus] || STATUS_STYLES.draft,
      )}
    >
      {t(toCamelCase(displayStatus))}
    </span>
  );
}
