'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Assistant', href: '/chat', icon: MessageSquare },
];

const navGroups: NavGroup[] = [
  {
    name: 'Sales',
    icon: ShoppingCart,
    items: [
      { name: 'Quotes', href: '/sales/quotes', icon: FileText },
      { name: 'Orders', href: '/sales/orders', icon: ClipboardList },
      { name: 'Invoices', href: '/sales/invoices', icon: Receipt },
      { name: 'Credit Notes', href: '/sales/credit-notes', icon: CreditCard },
      { name: 'Dunning', href: '/sales/dunning', icon: AlertTriangle },
    ],
  },
  {
    name: 'Purchasing',
    icon: Truck,
    items: [
      { name: 'Purchase Orders', href: '/purchasing/purchase-orders', icon: ClipboardList },
      { name: 'Purchase Invoices', href: '/purchasing/purchase-invoices', icon: Receipt },
    ],
  },
  {
    name: 'Accounting',
    icon: BookOpen,
    items: [
      { name: 'Overview', href: '/accounting', icon: BookOpen },
      { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: FileText },
      { name: 'Journal', href: '/accounting/journal', icon: ClipboardList },
      { name: 'Fiscal Years', href: '/accounting/fiscal-years', icon: BarChart3 },
    ],
  },
  {
    name: 'Inventory',
    icon: Warehouse,
    items: [
      { name: 'Warehouses', href: '/inventory', icon: Warehouse },
      { name: 'Stock Movements', href: '/inventory/movements', icon: ArrowUpDown },
    ],
  },
];

const standaloneNavigation: NavItem[] = [
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Banking', href: '/banking', icon: Wallet },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
];

const secondaryNavigation: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.name}
    </Link>
  );
}

function CollapsibleGroup({ group, pathname, onNavClick }: { group: NavGroup; pathname: string; onNavClick?: () => void }) {
  const isAnyActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const [isOpen, setIsOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isAnyActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <group.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{group.name}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onClick={onNavClick} />
          ))}
        </div>
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

  const sidebarContent = (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r bg-card h-full">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600" />
        <span className="text-xl font-bold">Kivvi</span>
      </div>

      {/* Company selector */}
      <div className="border-b p-4">
        <button className="flex w-full items-center gap-3 rounded-lg bg-muted p-3 text-left hover:bg-muted/80">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 truncate">
            <p className="text-sm font-medium">
              {session?.user?.companyName || 'My Company'}
            </p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {/* Top-level items */}
        {topNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
        ))}

        {/* Separator */}
        <div className="my-3 border-t" />

        {/* Collapsible groups */}
        {navGroups.map((group) => (
          <CollapsibleGroup key={group.name} group={group} pathname={pathname} onNavClick={onClose} />
        ))}

        {/* Separator */}
        <div className="my-3 border-t" />

        {/* Standalone items */}
        {standaloneNavigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
        ))}
      </nav>

      {/* Secondary navigation */}
      <div className="border-t p-4">
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">{sidebarContent}</div>

      {/* Mobile overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          {/* Slide-over sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
