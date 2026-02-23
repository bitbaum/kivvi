'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchInputProps {
  /** Base path for the page (e.g., '/contacts') */
  basePath: string;
  /** Placeholder text */
  placeholder: string;
  /** URL param name (default: 'search') */
  paramName?: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** URL params to preserve when searching (e.g., ['type', 'status']) */
  preserveParams?: string[];
}

/**
 * Client-side search input that syncs with URL search params.
 * Debounces input and pushes to URL, triggering server component re-render.
 */
export function SearchInput({
  basePath,
  placeholder,
  paramName = 'search',
  debounceMs = 300,
  preserveParams = [],
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(paramName) || '';
  const [value, setValue] = useState(currentValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync input when URL changes externally (e.g., back/forward navigation)
  useEffect(() => {
    setValue(searchParams.get(paramName) || '');
  }, [searchParams, paramName]);

  const pushToUrl = useCallback(
    (term: string) => {
      const params = new URLSearchParams();
      // Preserve specified params from current URL
      for (const key of preserveParams) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
      }
      if (term) {
        params.set(paramName, term);
      }
      // Reset to page 1 on new search
      params.delete('page');
      const qs = params.toString();
      router.push(`${basePath}${qs ? `?${qs}` : ''}`);
    },
    [router, searchParams, basePath, paramName, preserveParams]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushToUrl(newValue), debounceMs);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative flex-1 sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
