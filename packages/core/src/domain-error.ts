/**
 * Structured domain error that carries a machine-readable code for i18n.
 * Throw this instead of plain Error for user-facing business rule violations.
 * The English .message serves as a fallback for logging and Sentry.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly params?: Record<string, string>,
    englishMessage?: string,
  ) {
    super(englishMessage ?? code);
    this.name = "DomainError";
  }
}
