import React, { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}

/**
 * Reusable form field wrapper that displays label, input, and validation errors.
 * Shows field-level error messages with red border and error text below the input.
 * Automatically links error messages to inputs via aria-describedby.
 */
export function FormField({
  label,
  name,
  error,
  required = false,
  children,
  description,
}: FormFieldProps) {
  const hasError = error && error.length > 0;
  const errorMessage = hasError ? error[0] : undefined;
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;
  const describedBy =
    [description ? descriptionId : null, hasError ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  // Inject aria-describedby into the first child element
  const enhancedChildren = describedBy
    ? Children.map(children, (child, index) =>
        index === 0 && isValidElement<Record<string, unknown>>(child)
          ? cloneElement(child, { "aria-describedby": describedBy } as Record<string, unknown>)
          : child,
      )
    : children;

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      <div
        className={cn(
          hasError &&
            "[&_input]:border-destructive [&_select]:border-destructive [&_textarea]:border-destructive",
        )}
      >
        {enhancedChildren}
      </div>

      {hasError && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

interface FormFieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * Input component with error styling.
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormFieldInputProps>(function FormInput(
  { error, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none h-10 border-input focus:ring-2 focus:ring-ring disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    />
  );
});

interface FormFieldTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/**
 * Textarea component with error styling.
 */
export function FormTextarea({ error, className, ...props }: FormFieldTextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}

interface FormFieldSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/**
 * Select component with error styling.
 */
export function FormSelect({ error, className, children, ...props }: FormFieldSelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none h-10 border-input focus:ring-2 focus:ring-ring disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
