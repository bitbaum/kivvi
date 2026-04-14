import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "@/lib/config/document-types";

const ACTIVE_INACTIVE_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-neutral/10 text-neutral",
};

interface StatusBadgeProps {
  /** The status key used to look up styles */
  status: string;
  /** The displayed label text */
  label: string;
  /** Custom style map (defaults to STATUS_STYLES from document-types config) */
  styleMap?: Record<string, string>;
  className?: string;
}

interface VariantBadgeProps {
  /** Use "active" or "inactive" for the common boolean pattern */
  variant: "active" | "inactive";
  /** The displayed label text */
  label: string;
  className?: string;
}

type Props = StatusBadgeProps | VariantBadgeProps;

function isVariantProps(props: Props): props is VariantBadgeProps {
  return "variant" in props;
}

export function StatusBadge(props: Props) {
  const baseClasses = "rounded-full px-2.5 py-0.5 text-xs font-medium";

  if (isVariantProps(props)) {
    return (
      <span
        className={cn(
          baseClasses,
          ACTIVE_INACTIVE_STYLES[props.variant],
          props.className,
        )}
      >
        {props.label}
      </span>
    );
  }

  const styles = props.styleMap ?? STATUS_STYLES;
  return (
    <span
      className={cn(baseClasses, styles[props.status] || "", props.className)}
    >
      {props.label}
    </span>
  );
}
