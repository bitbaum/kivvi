'use client';

import { useState, useTransition } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { createContactAction } from '@/app/actions/contacts';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface QuickCreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (contact: { id: string; name: string }) => void;
  initialName?: string;
  contactType?: 'customer' | 'vendor' | 'both';
}

export function QuickCreateContactModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
  contactType = 'customer',
}: QuickCreateContactModalProps) {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'customer' | 'vendor' | 'both'>(contactType);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleClose() {
    if (isPending) return;
    setName(initialName);
    setEmail('');
    setPhone('');
    setType(contactType);
    setError(null);
    setFieldErrors({});
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }

    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('type', type);
      if (email.trim()) formData.append('email', email.trim());
      if (phone.trim()) formData.append('phone', phone.trim());

      const result = await createContactAction(formData);

      if (result.success && result.data) {
        onSuccess({ id: result.data.id, name: name.trim() });
        handleClose();
      } else {
        setError(result.error || 'Failed to create contact');
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t('quickCreate')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('quickCreateDesc')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t('type')} *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['customer', 'vendor', 'both'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  disabled={isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    type === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {t(`types.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Name (required) */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t('name')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder={t('namePlaceholder')}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
                fieldErrors.name && "border-destructive"
              )}
              autoFocus
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Email (optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder={t('emailPlaceholder')}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
                fieldErrors.email && "border-destructive"
              )}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t('phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              placeholder={t('phonePlaceholder')}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50",
                fieldErrors.phone && "border-destructive"
              )}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.phone[0]}</p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className={cn(
                "flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                (isPending || !name.trim()) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tc('creating')}
                </span>
              ) : (
                tc('create')
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {tc('cancel')}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('quickCreateNote')}
          </p>
        </form>
      </div>
    </div>
  );
}
