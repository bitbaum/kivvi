import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { RepairImportForm } from './repair-import-form';

export default async function RepairImportPage() {
  const t = await getTranslations('settings');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="rounded-lg border p-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Repair Import</h1>
          <p className="text-sm text-muted-foreground">
            Re-import line items for invoices and purchase invoices from Kivitendo CSV exports
          </p>
        </div>
      </div>

      <RepairImportForm />
    </div>
  );
}
