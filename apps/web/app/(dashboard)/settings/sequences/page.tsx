import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Hash } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { numberSequences } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { SequenceRow } from './sequence-row';

const TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice (RE)',
  quote: 'Quote (AN)',
  order: 'Order (AU)',
  credit_note: 'Credit Note (GU)',
  delivery_note: 'Delivery Note (LS)',
  purchase_order: 'Purchase Order (BE)',
  contact: 'Contact (K)',
  product: 'Product (ART)',
};

export default async function SequencesSettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  const sequences = await db
    .select()
    .from(numberSequences)
    .where(eq(numberSequences.companyId, session.user.companyId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
        <h1 className="text-3xl font-bold">Number Sequences</h1>
        <p className="text-muted-foreground">
          Configure document numbering formats and next numbers.
        </p>
      </div>

      {/* Sequences table */}
      <div className="rounded-xl border bg-card">
        {sequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Hash className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No number sequences</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Number sequences will be created automatically when needed.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div>Type</div>
              <div>Prefix</div>
              <div>Next Number</div>
              <div>Format</div>
              <div></div>
            </div>

            {/* Table rows */}
            <div className="divide-y">
              {sequences.map((seq) => (
                <SequenceRow
                  key={seq.id}
                  sequence={{
                    id: seq.id,
                    type: seq.type,
                    prefix: seq.prefix,
                    nextNumber: seq.nextNumber,
                    format: seq.format,
                  }}
                  typeLabel={TYPE_LABELS[seq.type] || seq.type}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
