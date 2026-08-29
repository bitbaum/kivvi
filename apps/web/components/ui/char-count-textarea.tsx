import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CharCountTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength: number;
  value: string;
  showCounter?: boolean;
}

/**
 * Textarea field with character counter.
 * Shows "X / MAX" in the bottom-right corner.
 */
export const CharCountTextarea = forwardRef<HTMLTextAreaElement, CharCountTextareaProps>(
  ({ className, maxLength, value, showCounter = true, ...props }, ref) => {
    const remaining = maxLength - value.length;
    const isNearLimit = remaining <= maxLength * 0.2; // Show warning when 80% full

    return (
      <div className="relative">
        <textarea
          ref={ref}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            showCounter && "pb-6", // Add padding for counter
            className,
          )}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        {showCounter && value.length > 0 && (
          <span
            className={cn(
              "absolute bottom-2 right-3 text-xs tabular-nums",
              isNearLimit ? "text-warning font-medium" : "text-muted-foreground",
            )}
          >
            {value.length} / {maxLength}
          </span>
        )}
      </div>
    );
  },
);

CharCountTextarea.displayName = "CharCountTextarea";
