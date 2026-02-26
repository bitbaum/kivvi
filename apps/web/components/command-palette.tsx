'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useCommandPalette } from '@/hooks/use-command-palette';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const tc = useTranslations('common');
  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    isSearching,
    sections,
    inputRef,
    listRef,
    navigate,
    handleKeyDown,
    placeholder,
    noResultsLabel,
  } = useCommandPalette(isOpen, onClose);

  if (!isOpen) return null;

  // Calculate global index for each item across sections
  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tc('aria.commandPalette')}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label={tc('search')}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedIndex(0); }}
              className="rounded p-0.5 hover:bg-muted"
              aria-label={tc('aria.clearSearch')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block" aria-hidden="true">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {sections.length === 0 && !isSearching ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {noResultsLabel}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.key} role="group" aria-label={section.label}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const itemIndex = globalIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-selected={isSelected}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground'} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {isSearching && (
            <div className="px-3 py-2 text-center text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
