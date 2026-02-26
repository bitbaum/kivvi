'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Locale } from '@/i18n/request';
import { LOCALE_CONFIG } from '@/lib/config/locales';
import { cn } from '@/lib/utils';

/**
 * Language switcher component for unauthenticated pages.
 * Shows a dropdown with available languages.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const tc = useTranslations('common');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function switchLocale(newLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`;
    setShowMenu(false);
    router.refresh();
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        aria-label={`Current language: ${LOCALE_CONFIG[locale].native}`}
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        {LOCALE_CONFIG[locale].short}
      </button>
      {showMenu && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-36 rounded-lg border bg-card p-1 shadow-lg"
          role="menu"
          aria-label={tc('aria.languageOptions')}
        >
          {(Object.entries(LOCALE_CONFIG) as [Locale, { short: string; native: string }][]).map(([loc, cfg]) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={cn('flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted', locale === loc && 'font-medium text-primary')}
              role="menuitem"
            >
              {cfg.native}
              {locale === loc && <span className="ml-auto text-primary" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
