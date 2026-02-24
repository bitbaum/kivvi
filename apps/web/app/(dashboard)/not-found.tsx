import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function DashboardNotFound() {
  const t = await getTranslations('common');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border bg-muted p-4">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">{t('notFoundTitle')}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t('notFoundMessage')}
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('goHome')}
      </Link>
    </div>
  );
}
