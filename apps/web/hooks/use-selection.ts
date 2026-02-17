'use client';

import { useState, useCallback, useMemo } from 'react';

export function useSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === allIds.length) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const isAllSelected = useMemo(
    () => allIds.length > 0 && selected.size === allIds.length,
    [allIds.length, selected.size]
  );

  const isSomeSelected = useMemo(
    () => selected.size > 0 && selected.size < allIds.length,
    [allIds.length, selected.size]
  );

  const count = selected.size;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isSomeSelected,
    count,
  };
}
