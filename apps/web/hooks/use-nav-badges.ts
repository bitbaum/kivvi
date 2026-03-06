'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface NavBadges {
  documents: number; // overdue invoices
  money: number; // unreconciled transactions
}

const EMPTY_BADGES: NavBadges = { documents: 0, money: 0 };

/**
 * Fetches sidebar badge counts from the API.
 * Polls every 5 minutes to keep badges fresh.
 */
export function useNavBadges(): NavBadges {
  const { data: session } = useSession();
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  useEffect(() => {
    if (!session?.user?.companyId) return;

    let cancelled = false;

    async function fetchBadges() {
      try {
        const res = await fetch('/api/nav-badges');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setBadges(data);
      } catch {
        // Silently fail — badges are non-critical
      }
    }

    fetchBadges();
    const interval = setInterval(fetchBadges, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.user?.companyId]);

  return badges;
}
