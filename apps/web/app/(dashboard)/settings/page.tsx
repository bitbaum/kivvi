import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, User, Hash, ArrowRight, RepeatIcon, CreditCard, Download } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies, users } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const t = await getTranslations('settings');

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  const sections = [
    {
      title: t('companySettings'),
      subtitle: company?.name || t('companySettingsDesc'),
      href: '/settings/company',
      icon: Building2,
    },
    {
      title: t('userProfile'),
      subtitle: user?.email || t('userProfileDesc'),
      href: '/settings/profile',
      icon: User,
    },
    {
      title: t('numberSequences'),
      subtitle: t('numberSequencesDesc'),
      href: '/settings/sequences',
      icon: Hash,
    },
    {
      title: t('recurring.title'),
      subtitle: t('recurring.settingsDesc'),
      href: '/settings/recurring-invoices',
      icon: RepeatIcon,
    },
    {
      title: t('billing.title'),
      subtitle: t('billing.settingsDesc'),
      href: '/settings/billing',
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Section cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg border bg-background p-3">
                <section.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Data & Privacy */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t('dataPrivacy.title')}</h2>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">{t('dataPrivacy.exportTitle')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dataPrivacy.exportDescription')}
              </p>
            </div>
            <a
              href="/api/export/full"
              download
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
            >
              <Download className="h-4 w-4" />
              {t('dataPrivacy.downloadButton')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
