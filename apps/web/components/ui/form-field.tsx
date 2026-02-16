import { cn } from '@/lib/utils';

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

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className={cn(hasError && "[&_input]:border-destructive [&_select]:border-destructive [&_textarea]:border-destructive")}>
        {children}
      </div>

      {hasError && (
        <p className="text-sm text-destructive">
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
export function FormInput({ error, className, ...props }: FormFieldInputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className
      )}
      {...props}
    />
  );
}

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
        "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className
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
        "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
        error && "border-destructive focus:ring-destructive",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
