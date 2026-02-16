'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { registerAction } from '@/app/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('auth');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Register using Server Action
      const result = await registerAction(formData);

      if (!result.success) {
        setError(result.error || t('errorGeneric'));
        setIsLoading(false);
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but sign in failed, redirect to login
        router.push('/login?registered=true');
        return;
      }

      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(t('errorGeneric'));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Language switcher in top-right corner */}
      <div className="fixed right-4 top-4">
        <LanguageSwitcher />
      </div>

      {/* Left side - Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600" />
              <span className="text-2xl font-bold">Kivvi</span>
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-semibold">{t('register')}</h1>
          <p className="mb-6 text-muted-foreground">
            {t('registerSubtitle')}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                {t('fullName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Max Muster"
                required
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                {t('emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="max@company.ch"
                required
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium">
                {t('companyName')}
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Muster GmbH"
                required
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-lg border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('passwordMinLength')}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? t('creatingAccount') : t('createAccount')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('signIn')}
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-12 lg:flex">
        <div className="max-w-md text-white">
          <h2 className="mb-6 text-3xl font-bold">
            {t('businessOnAutopilot')}
          </h2>
          <ul className="space-y-4">
            <Feature text={t('features.aiInvoices')} />
            <Feature text={t('features.bankMatching')} />
            <Feature text={t('features.paymentReminders')} />
            <Feature text={t('features.qrBills')} />
            <Feature text={t('features.selfHostAI')} />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
        <Check className="h-4 w-4" />
      </div>
      <span>{text}</span>
    </li>
  );
}
