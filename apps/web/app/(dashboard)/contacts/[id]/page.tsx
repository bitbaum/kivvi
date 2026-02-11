import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  MapPinned,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getContact } from '@kivvi/core';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { DeleteContactButton } from './delete-button';

const TYPE_LABELS: Record<string, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  both: 'Both',
};

const TYPE_STYLES: Record<string, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  vendor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: 'Quote',
  order: 'Order',
  order_confirmation: 'Order Confirmation',
  delivery_note: 'Delivery Note',
  invoice: 'Invoice',
  credit_note: 'Credit Note',
  purchase_order: 'Purchase Order',
  purchase_invoice: 'Purchase Invoice',
  dunning: 'Dunning',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  delivered: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

interface ContactDetailPageProps {
  params: { id: string };
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  const data = await getContact(db, session.user.companyId, params.id);
  if (!data) {
    notFound();
  }

  const { contact, addresses, recentDocuments } = data;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contact.name}</h1>
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  TYPE_STYLES[contact.type] || ''
                )}
              >
                {TYPE_LABELS[contact.type] || contact.type}
              </span>
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                  contact.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                {contact.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {contact.contactNumber && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {contact.contactNumber}
              </p>
            )}
            {(contact.firstName || contact.lastName) && (
              <p className="text-muted-foreground">
                {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${contact.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <DeleteContactButton contactId={contact.id} contactName={contact.name} />
          </div>
        </div>
      </div>

      {/* Content tabs using simple sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Contact details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">Contact Information</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile" value={contact.mobile} />
              <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={contact.website} />
            </div>
          </div>

          {/* Address */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Primary Address
              </h2>
            </div>
            <div className="p-6">
              {contact.address || contact.city || contact.postalCode ? (
                <div className="text-sm space-y-1">
                  {contact.address && <p>{contact.address}</p>}
                  {(contact.postalCode || contact.city) && (
                    <p>
                      {contact.postalCode} {contact.city}
                    </p>
                  )}
                  {contact.country && <p>{contact.country}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No address on file</p>
              )}
            </div>
          </div>

          {/* Additional Addresses */}
          {addresses.length > 0 && (
            <div className="rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPinned className="h-4 w-4" />
                  Additional Addresses ({addresses.length})
                </h2>
              </div>
              <div className="divide-y">
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                          Default
                        </span>
                      )}
                      {addr.name && (
                        <span className="text-sm font-medium">{addr.name}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {addr.address && <p>{addr.address}</p>}
                      {(addr.postalCode || addr.city) && (
                        <p>
                          {addr.postalCode} {addr.city}
                        </p>
                      )}
                      {addr.country && <p>{addr.country}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Documents */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Documents
              </h2>
            </div>
            {recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No documents yet
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{doc.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.type] || doc.type} &middot;{' '}
                        {formatDate(doc.issueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(parseFloat(doc.total))}
                      </p>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_STYLES[doc.status] || STATUS_STYLES.draft
                        )}
                      >
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Financial & settings */}
        <div className="space-y-6">
          {/* Financial Details */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Financial
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <InfoItem label="VAT Number" value={contact.vatNumber} />
              <InfoItem label="IBAN" value={contact.iban} />
              <InfoItem label="BIC" value={contact.bic} />
              <InfoItem
                label="Payment Terms"
                value={contact.paymentTermsDays ? `${contact.paymentTermsDays} days` : null}
              />
              <InfoItem
                label="Credit Limit"
                value={contact.creditLimit ? formatCurrency(parseFloat(contact.creditLimit)) : null}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Settings
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <InfoItem label="Language" value={contact.language?.toUpperCase()} />
              <InfoItem
                label="Created"
                value={formatDate(contact.createdAt)}
              />
              <InfoItem
                label="Updated"
                value={formatDate(contact.updatedAt)}
              />
              {contact.kivitendoId && (
                <InfoItem
                  label="Kivitendo ID"
                  value={contact.kivitendoId.toString()}
                />
              )}
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="rounded-xl border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="font-semibold">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '-'}</p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}
