'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Context-aware "New" action based on current page
  const handleNew = () => {
    if (pathname.startsWith('/contacts')) {
      router.push('/contacts/new');
    } else if (pathname.startsWith('/products')) {
      router.push('/products/new');
    } else if (pathname.startsWith('/sales/invoices')) {
      router.push('/sales/invoices/new');
    } else if (pathname.startsWith('/sales/quotes')) {
      router.push('/sales/quotes/new');
    } else if (pathname.startsWith('/sales/orders')) {
      router.push('/sales/orders/new');
    } else {
      // Default: create contact
      router.push('/contacts/new');
    }
  };

  // Focus search box (if exists on page)
  const handleFocusSearch = () => {
    const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[name="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    // Cmd/Ctrl + K: Command palette (placeholder for now)
    {
      key: 'k',
      metaKey: true,
      callback: () => {
        // TODO: Implement command palette
      },
    },
    // /: Focus search
    {
      key: '/',
      callback: handleFocusSearch,
    },
    // N: Create new
    {
      key: 'n',
      callback: handleNew,
    },
    // ?: Show shortcuts help
    {
      key: '?',
      shiftKey: true,
      callback: () => setShowShortcutsHelp(true),
    },
    // Esc: Close modals/sidebar
    {
      key: 'Escape',
      callback: () => {
        setSidebarOpen(false);
        setShowShortcutsHelp(false);
      },
      preventDefault: false, // Allow default behavior for other modals
    },
  ]);

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6" role="main">
          {children}
        </main>
        <Footer />
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}
