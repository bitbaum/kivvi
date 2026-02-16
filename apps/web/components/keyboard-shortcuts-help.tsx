'use client';

import { X, Command, Slash, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const tc = useTranslations('common');

  if (!isOpen) return null;

  const shortcuts = [
    {
      keys: ['⌘ K', 'Ctrl K'],
      description: 'Open command palette',
      icon: <Command className="h-4 w-4" />,
    },
    {
      keys: ['/'],
      description: 'Focus search box',
      icon: <Slash className="h-4 w-4" />,
    },
    {
      keys: ['N'],
      description: 'Create new (context-aware)',
      icon: <Plus className="h-4 w-4" />,
    },
    {
      keys: ['?'],
      description: 'Show keyboard shortcuts',
    },
    {
      keys: ['Esc'],
      description: 'Close modals/dropdowns',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use these shortcuts to navigate faster
          </p>
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {shortcut.icon && (
                  <div className="text-muted-foreground">{shortcut.icon}</div>
                )}
                <span className="text-sm">{shortcut.description}</span>
              </div>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="rounded border border-muted bg-muted/50 px-2 py-1 text-xs font-mono">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-xs text-muted-foreground">or</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          💡 Tip: Press <kbd className="rounded border bg-background px-1">?</kbd> anytime to see
          these shortcuts
        </div>
      </div>
    </div>
  );
}
