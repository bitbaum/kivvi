import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  callback: () => void;
  preventDefault?: boolean;
}

/**
 * Hook to register global keyboard shortcuts.
 * Supports Cmd/Ctrl modifiers and common shortcuts.
 *
 * Example usage:
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'k', metaKey: true, callback: () => setCommandPaletteOpen(true) },
 *   { key: '/', callback: () => focusSearch() },
 *   { key: 'n', callback: () => router.push('/contacts/new') },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : true;
        const metaMatches = shortcut.metaKey ? event.metaKey || event.ctrlKey : true; // Ctrl on Windows/Linux, Cmd on Mac
        const shiftMatches = shortcut.shiftKey !== undefined ? shortcut.shiftKey === event.shiftKey : true;

        // Skip if typing in input (unless it's Escape or explicitly allows inputs)
        if (isInput && shortcut.key !== 'Escape' && shortcut.key !== '/') {
          continue;
        }

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback();
          break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
