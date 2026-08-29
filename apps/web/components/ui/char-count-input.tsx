import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CharCountInputProps extends InputHTMLAttributes<HTMLInputElement> {
  maxLength: number;
  value: string;
  showCounter?: boolean;
}

/**
 * Input field with character counter.
 * Shows "X / MAX" in the corner when user is typing.
 */
export const CharCountInput = forwardRef<HTMLInputElement, CharCountInputProps>(
  ({ className, maxLength, value, showCounter = true, ...props }, ref) => {
    const remaining = maxLength - value.length;
    const isNearLimit = remaining <= maxLength * 0.2; // Show warning when 80% full

    return (
      <div className="relative">
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            showCounter && "pr-16", // Add padding for counter
            className,
          )}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        {showCounter && value.length > 0 && (
          <span
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
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

CharCountInput.displayName = "CharCountInput";
