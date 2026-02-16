import { redirect } from 'next/navigation';
import {
  BookOpen,
  MessageSquare,
  Keyboard,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { auth } from '@/lib/auth';

export default async function HelpPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect('/login');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Help</h1>
        <p className="text-muted-foreground">
          Resources and shortcuts to help you get the most out of Kivvi.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">AI Assistant</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask Kivvi to create invoices, search contacts, check payments, or generate reports. Go to AI Assistant in the sidebar.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">Getting Started</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your company in Settings, add contacts and products, then create your first invoice under Sales.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">Support</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Need help? Contact us at{' '}
            <a href="mailto:support@revamp-it.ch" className="text-primary hover:underline">
              support@revamp-it.ch
            </a>
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg border bg-background p-3">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">Keyboard Shortcuts</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { keys: '/', description: 'Focus search' },
            { keys: 'N', description: 'Create new (context-aware)' },
            { keys: 'Esc', description: 'Close modals / sidebar' },
          ].map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center gap-3">
              <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border bg-muted px-2 font-mono text-xs">
                {shortcut.keys}
              </kbd>
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-3">Quick Links</h2>
        <div className="space-y-2">
          {[
            { label: 'Swiss QR-Bill Standard', href: 'https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html' },
            { label: 'Swiss VAT Rates (ESTV)', href: 'https://www.estv.admin.ch/estv/en/home/value-added-tax.html' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
