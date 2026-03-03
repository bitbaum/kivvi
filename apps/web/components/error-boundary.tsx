'use client';

import { Component, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback() {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-900/10">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
        <h3 className="mt-4 font-semibold">{t('errorBoundaryTitle')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('errorBoundaryMessage')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          {t('errorBoundaryReload')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught', error, { componentStack: errorInfo.componentStack ?? undefined });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
