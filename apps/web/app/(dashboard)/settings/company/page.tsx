import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { CompanyForm } from './company-form';

export default async function CompanySettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect('/settings');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">
          Update your company information and preferences.
        </p>
      </div>

      <CompanyForm
        initialData={{
          name: company.name,
          legalName: company.legalName || '',
          vatNumber: company.vatNumber || '',
          address: company.address || '',
          city: company.city || '',
          postalCode: company.postalCode || '',
          country: company.country || 'CH',
          currency: company.currency || 'CHF',
        }}
      />
    </div>
  );
}
