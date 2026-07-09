import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface BackButtonProps {
  href: string;
  /** Optional override for aria-label */
  label?: string;
  className?: string;
}

/**
 * Accessible back navigation control (44×44 touch target).
 * SSOT for detail pages and settings subpages.
 */
export async function BackButton({
  href,
  label,
  className = "",
}: BackButtonProps) {
  const t = await getTranslations("common");

  return (
    <Link
      href={href}
      aria-label={label ?? t("back")}
      className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border p-2 transition-colors hover:bg-muted ${className}`}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
