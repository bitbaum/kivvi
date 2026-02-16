'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { deleteContactAction } from '@/app/actions/contacts';
import { cn } from '@/lib/utils';

interface DeleteContactButtonProps {
  contactId: string;
  contactName: string;
}

export function DeleteContactButton({ contactId, contactName }: DeleteContactButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const t = useTranslations('contacts');
  const tc = useTranslations('common');

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteContactAction(contactId);
      if (result.success) {
        router.push('/contacts');
      } else {
        alert(result.error || tc('error'));
      }
    } catch {
      alert(tc('error'));
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t('deleteConfirm', { name: contactName })}
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors',
            isDeleting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {tc('yes')}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          {tc('cancel')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="h-4 w-4" />
      {tc('delete')}
    </button>
  );
}
