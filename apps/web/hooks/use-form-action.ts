"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/actions/utils";

interface UseFormActionOptions<T> {
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (error: string) => void;
}

export function useFormAction<T>(
  action: (...args: unknown[]) => Promise<ActionResult<T>>,
  options: UseFormActionOptions<T> = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const execute = async (...args: unknown[]) => {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    const result = await action(...args);
    if (result.success) {
      options.onSuccess?.(result.data as T);
    } else {
      const msg = result.error ?? "Ein Fehler ist aufgetreten";
      setError(msg);
      setFieldErrors(result.fieldErrors ?? {});
      options.onError?.(msg);
      setIsLoading(false);
    }
    return result;
  };

  return { isLoading, error, fieldErrors, execute, setError, setFieldErrors };
}
