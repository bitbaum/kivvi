"use client";

import { SectionErrorBoundary } from "@/components/section-error-boundary";

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionErrorBoundary error={error} reset={reset} backHref="/contacts" />;
}
