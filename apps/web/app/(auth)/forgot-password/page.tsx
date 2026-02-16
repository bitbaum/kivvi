'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { requestPasswordResetAction } from '@/app/actions/password-reset';
import { LanguageSwitcher } from '@/components/language-switcher';

function ForgotPasswordForm() {
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await requestPasswordResetAction({ email });

      if (!result.success) {
        setError(result.error || t('errorGeneric'));
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError(t('errorGeneric'));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      {/* Language switcher in top-right corner */}
      <div className="fixed right-4 top-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600" />
            <span className="text-2xl font-bold">Kivvi</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          {success ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="mb-2 text-2xl font-semibold">{t('checkYourEmail')}</h1>
              <p className="mb-6 text-muted-foreground">
                {t('resetEmailSent')}
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg border bg-background py-2.5 font-medium hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('backToSignIn')}
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-semibold">{t('resetPassword')}</h1>
              <p className="mb-6 text-muted-foreground">
                {t('resetPasswordSubtitle')}
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                    {t('emailAddress')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.ch"
                    required
                    className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoading ? t('sendingResetLink') : t('sendResetLink')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('backToSignIn')}
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t.rich('termsAndPrivacy', {
            terms: (chunks) => <Link href="/terms" className="hover:underline">{chunks}</Link>,
            privacy: (chunks) => <Link href="/privacy" className="hover:underline">{chunks}</Link>,
          })}
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
