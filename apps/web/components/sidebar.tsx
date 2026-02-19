'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useChatWidget } from '@/hooks/use-chat-widget';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Wallet,
  Users,
  Package,
  Settings,
  HelpCircle,
  Building2,
  Warehouse,
  BarChart3,
  FolderKanban,
  X,
} from 'lucide-react';

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Additional path prefixes that mark this item as active */
  activePrefixes?: string[];
}

// Core navigation — flat, 8 items
const primaryNavigation: NavItem[] = [
  { nameKey: 'home', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'people', href: '/contacts', icon: Users },
  { nameKey: 'catalog', href: '/products', icon: Package },
  {
    nameKey: 'documents',
    href: '/documents',
    icon: FileText,
    activePrefixes: ['/sales', '/purchasing'],
  },
  {
    nameKey: 'money',
    href: '/money',
    icon: Wallet,
    activePrefixes: ['/banking', '/accounting'],
  },
  { nameKey: 'inventory', href: '/inventory', icon: Warehouse },
  { nameKey: 'projects', href: '/projects', icon: FolderKanban },
  { nameKey: 'reports', href: '/reports', icon: BarChart3 },
];

const secondaryNavigation: NavItem[] = [
  { nameKey: 'settings', href: '/settings', icon: Settings },
  { nameKey: 'help', href: '/help', icon: HelpCircle },
];

function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
  if (item.activePrefixes) {
    return item.activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    );
  }
  return false;
}

function NavLink({ item, pathname, onClick, t }: { item: NavItem; pathname: string; onClick?: () => void; t: (key: string) => string }) {
  const isActive = isNavActive(item, pathname);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <item.icon className="h-4 w-4" aria-hidden="true" />
      {t(item.nameKey)}
    </Link>
  );
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const chatWidget = useChatWidget();

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sidebarContent = (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r bg-card h-full" role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          aria-label="Kivvi Home"
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600" aria-hidden="true" />
          <span className="text-xl font-bold">Kivvi</span>
        </Link>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-2 hover:bg-muted lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Company selector */}
      <div className="border-b p-4">
        <Link
          href="/settings/company"
          className="flex w-full items-center gap-3 rounded-lg bg-muted p-3 text-left hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Company settings"
        >
          <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">
              {session?.user?.companyName || tc('myCompany')}
            </p>
            <p className="text-xs text-muted-foreground">{tc('freePlan')}</p>
          </div>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Primary navigation">
        {/* AI Assistant — opens widget */}
        <button
          onClick={() => {
            chatWidget.open();
            onClose?.();
          }}
          className={cn(
            'flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            chatWidget.isOpen
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {t('aiAssistant')}
        </button>

        <div className="my-3 border-t" role="separator" />

        {primaryNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} t={t} />
        ))}
      </nav>

      {/* Secondary navigation */}
      <nav className="border-t p-4" aria-label="Secondary navigation">
        {secondaryNavigation.map((item) => {
          const isActive = isNavActive(item, pathname);
          return (
            <Link
              key={item.nameKey}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {t(item.nameKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebarContent}</div>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
