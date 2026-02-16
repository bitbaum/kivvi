'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRightLeft } from 'lucide-react';
import { updateDocumentStatusAction, convertDocumentAction } from '@/app/actions/documents';
import type { DocumentTypeConfig, StatusAction } from '@/lib/config/document-types';
import type { DocumentStatus, DocumentType } from '@kivvi/database';
import { DOCUMENT_TYPES } from '@/lib/config/document-types';

export function DocumentStatusActions({
  documentId,
  currentStatus,
  config,
}: {
  documentId: string;
  currentStatus: string;
  config: DocumentTypeConfig;
}) {
  const router = useRouter();
  const t = useTranslations('statusActions');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions = config.actions[currentStatus as DocumentStatus] || [];

  if (actions.length === 0) return null;

  async function handleAction(targetStatus: DocumentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateDocumentStatusAction(documentId, targetStatus);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Failed to update status');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {actions.map((action: StatusAction) => (
        <button
          key={action.targetStatus}
          onClick={() => handleAction(action.targetStatus)}
          disabled={isPending}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            action.variant === 'destructive'
              ? 'border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20'
              : action.variant === 'primary'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border hover:bg-muted'
          }`}
        >
          {t(action.label)}
        </button>
      ))}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function DocumentConvertActions({
  documentId,
  config,
}: {
  documentId: string;
  config: DocumentTypeConfig;
}) {
  const router = useRouter();
  const t = useTranslations('documents');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (config.conversionTargets.length === 0) return null;

  async function handleConvert(targetType: DocumentType) {
    setError(null);
    startTransition(async () => {
      const result = await convertDocumentAction(documentId, targetType);
      if (result.success && result.data) {
        const targetConfig = DOCUMENT_TYPES[targetType];
        router.push(`${targetConfig.basePath}/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to convert document');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {config.conversionTargets.map((targetType) => {
        const targetConfig = DOCUMENT_TYPES[targetType];
        return (
          <button
            key={targetType}
            onClick={() => handleConvert(targetType)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            {t('convertTo')} {t(targetConfig.label)}
          </button>
        );
      })}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
