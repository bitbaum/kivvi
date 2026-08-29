"use client";

import { SectionErrorBoundary } from "@/components/section-error-boundary";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionErrorBoundary error={error} reset={reset} backHref="/products" />;
}
