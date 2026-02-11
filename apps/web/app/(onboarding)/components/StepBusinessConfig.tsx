'use client';

import { useState } from 'react';
import { Loader2, Settings, Check } from 'lucide-react';
import { initializeCompanyAction } from '@/app/actions/onboarding';

interface StepBusinessConfigProps {
  onComplete: () => void;
  onBack: () => void;
}

export function StepBusinessConfig({ onComplete, onBack }: StepBusinessConfigProps) {
  const [vatRate, setVatRate] = useState(8.1);
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [bankIban, setBankIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupResult, setSetupResult] = useState<{ accountsCreated: number; sequencesCreated: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await initializeCompanyAction({
      defaultVatRate: vatRate,
      defaultPaymentTermsDays: paymentTerms,
      bankIban: bankIban || null,
      bankName: bankName || null,
    });

    if (result.success && result.data) {
      setSetupResult(result.data);
      // Brief delay to show the success state
      setTimeout(() => onComplete(), 1500);
    } else {
      setError(result.error || 'Failed to initialize');
      setIsLoading(false);
    }
  };

  if (setupResult) {
    return (
      <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Business setup complete</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{setupResult.accountsCreated} accounts created (Swiss KMU Kontenrahmen)</p>
            <p>{setupResult.sequencesCreated} number sequences initialized</p>
            <p>Default warehouse &quot;Hauptlager&quot; created</p>
            <p>Fiscal year {new Date().getFullYear()} with 12 periods</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Business Configuration</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure your defaults. This will set up your chart of accounts, number sequences, and warehouse.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* VAT Rate */}
        <div>
          <label className="mb-3 block text-sm font-medium">Default VAT rate</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: 8.1, label: '8.1%', desc: 'Standard rate' },
              { value: 2.6, label: '2.6%', desc: 'Reduced rate' },
              { value: 0, label: '0%', desc: 'Exempt' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  vatRate === option.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="vatRate"
                  value={option.value}
                  checked={vatRate === option.value}
                  onChange={() => setVatRate(option.value)}
                  className="sr-only"
                />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    vatRate === option.value ? 'border-primary' : 'border-muted-foreground/40'
                  }`}
                >
                  {vatRate === option.value && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Terms */}
        <div>
          <label htmlFor="paymentTerms" className="mb-1.5 block text-sm font-medium">
            Default payment terms (days)
          </label>
          <input
            id="paymentTerms"
            type="number"
            min={0}
            max={365}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(parseInt(e.target.value) || 30)}
            className="w-full max-w-xs rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Net payment within this many days
          </p>
        </div>

        {/* Bank Details */}
        <div>
          <h3 className="mb-3 text-sm font-medium">Bank account (for QR-bills)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bankIban" className="mb-1.5 block text-sm text-muted-foreground">
                IBAN
              </label>
              <input
                id="bankIban"
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="CH93 0076 2011 6238 5295 7"
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="bankName" className="mb-1.5 block text-sm text-muted-foreground">
                Bank name
              </label>
              <input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="PostFinance"
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* What will be created */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-2 text-sm font-medium">This will automatically create:</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>227 Swiss KMU chart of accounts</li>
            <li>11 number sequences (invoices, quotes, orders, etc.)</li>
            <li>Default warehouse &quot;Hauptlager&quot;</li>
            <li>Fiscal year {new Date().getFullYear()} with 12 monthly periods</li>
          </ul>
        </div>

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="rounded-lg border px-6 py-2.5 font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Setting up your business...' : 'Set up business'}
          </button>
        </div>
      </form>
    </div>
  );
}
