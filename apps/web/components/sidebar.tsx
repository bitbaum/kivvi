'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
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
  ShoppingCart,
  Receipt,
  CreditCard,
  AlertTriangle,
  Truck,
  ClipboardList,
  Warehouse,
  BookOpen,
  BarChart3,
  FolderKanban,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  nameKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topNavigation: NavItem[] = [
  { nameKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { nameKey: 'aiAssistant', href: '/chat', icon: MessageSquare },
];

const navGroups: NavGroup[] = [
  {
    nameKey: 'sales',
    icon: ShoppingCart,
    items: [
      { nameKey: 'quotes', href: '/sales/quotes', icon: FileText },
      { nameKey: 'orders', href: '/sales/orders', icon: ClipboardList },
      { nameKey: 'invoices', href: '/sales/invoices', icon: Receipt },
      { nameKey: 'deliveryNotes', href: '/sales/delivery-notes', icon: Truck },
      { nameKey: 'creditNotes', href: '/sales/credit-notes', icon: CreditCard },
      { nameKey: 'dunning', href: '/sales/dunning', icon: AlertTriangle },
    ],
  },
  {
    nameKey: 'purchasing',
    icon: Truck,
    items: [
      { nameKey: 'purchaseOrders', href: '/purchasing/purchase-orders', icon: ClipboardList },
      { nameKey: 'purchaseInvoices', href: '/purchasing/purchase-invoices', icon: Receipt },
    ],
  },
  {
    nameKey: 'accounting',
    icon: BookOpen,
    items: [
      { nameKey: 'overview', href: '/accounting', icon: BookOpen },
      { nameKey: 'chartOfAccounts', href: '/accounting/chart-of-accounts', icon: FileText },
      { nameKey: 'journal', href: '/accounting/journal', icon: ClipboardList },
      { nameKey: 'fiscalYears', href: '/accounting/fiscal-years', icon: BarChart3 },
    ],
  },
  {
    nameKey: 'inventory',
    icon: Warehouse,
    items: [
      { nameKey: 'warehouses', href: '/inventory', icon: Warehouse },
      { nameKey: 'stockMovements', href: '/inventory/movements', icon: ArrowUpDown },
    ],
  },
];

const standaloneNavigation: NavItem[] = [
  { nameKey: 'contacts', href: '/contacts', icon: Users },
  { nameKey: 'products', href: '/products', icon: Package },
  { nameKey: 'banking', href: '/banking', icon: Wallet },
  { nameKey: 'reports', href: '/reports', icon: BarChart3 },
  { nameKey: 'projects', href: '/projects', icon: FolderKanban },
];

const secondaryNavigation: NavItem[] = [
  { nameKey: 'settings', href: '/settings', icon: Settings },
  { nameKey: 'help', href: '/help', icon: HelpCircle },
];

function NavLink({ item, pathname, onClick, t }: { item: NavItem; pathname: string; onClick?: () => void; t: (key: string) => string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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

function CollapsibleGroup({ group, pathname, onNavClick, t }: { group: NavGroup; pathname: string; onNavClick?: () => void; t: (key: string) => string }) {
  const isAnyActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const [isOpen, setIsOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`${t(group.nameKey)} ${isOpen ? 'collapse' : 'expand'}`}
        className={cn(
          'flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isAnyActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <group.icon className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1 text-left">{t(group.nameKey)}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
      {isOpen && (
        <nav className="ml-4 mt-1 space-y-0.5 border-l pl-3" aria-label={t(group.nameKey)}>
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onNavClick} t={t} />
          ))}
        </nav>
      )}
    </div>
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
      {/* Logo - NOW CLICKABLE */}
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

      {/* Company selector - NOW FUNCTIONAL */}
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
        {topNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} t={t} />
        ))}

        <div className="my-3 border-t" role="separator" />

        {navGroups.map((group) => (
          <CollapsibleGroup key={group.nameKey} group={group} pathname={pathname} onNavClick={onClose} t={t} />
        ))}

        <div className="my-3 border-t" role="separator" />

        {standaloneNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} t={t} />
        ))}
      </nav>

      {/* Secondary navigation */}
      <nav className="border-t p-4" aria-label="Secondary navigation">
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
