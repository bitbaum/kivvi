"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getNavBadgesAction } from "@/app/actions/dashboard-preferences";

export interface NavBadges {
  documents: number; // overdue invoices
  money: number; // unreconciled transactions
  repair: number; // items in repair
}

const EMPTY_BADGES: NavBadges = { documents: 0, money: 0, repair: 0 };

export function useNavBadges(): NavBadges {
  const { data: session } = useSession();
  const [badges, setBadges] = useState<NavBadges>(EMPTY_BADGES);

  useEffect(() => {
    if (!session?.user?.companyId) return;

    let cancelled = false;

    async function fetchBadges() {
      try {
        const result = await getNavBadgesAction();
        if (!cancelled && result.success && result.data) setBadges(result.data);
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
