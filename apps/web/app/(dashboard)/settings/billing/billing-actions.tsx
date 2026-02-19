'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createCheckoutSessionAction, createPortalSessionAction } from '@/app/actions/billing';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface BillingActionsProps {
  plan: string;
  hasSubscription: boolean;
}

export function BillingActions({ plan, hasSubscription }: BillingActionsProps) {
  const t = useTranslations('settings.billing');
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const result = await createCheckoutSessionAction();
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error(result.error || t('upgradeError'));
      }
    } catch {
      toast.error(t('upgradeError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const result = await createPortalSessionAction();
      if (result.success && result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error(result.error || t('manageError'));
      }
    } catch {
      toast.error(t('manageError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3">
      {plan !== 'premium' && (
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('upgrade')}
        </button>
      )}
      {hasSubscription && (
        <button
          onClick={handleManage}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('manageSubscription')}
        </button>
      )}
    </div>
  );
}
