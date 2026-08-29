"use client";

import { SectionErrorBoundary } from "@/components/section-error-boundary";

export default function SalesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionErrorBoundary error={error} reset={reset} backHref="/documents" />;
}
