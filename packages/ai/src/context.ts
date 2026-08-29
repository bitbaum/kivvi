import type { Database } from "@kivvi/database";
import { fetchBusinessSnapshot } from "@kivvi/core";
import { DEFAULT_LOCALE, DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";

/**
 * Build a business snapshot string for the AI system prompt.
 * Gives the AI baseline context about the company so it can answer
 * general questions without tool calls, while using tools for specifics.
 */
export async function getBusinessSnapshot(
  db: unknown,
  companyId: string,
  currency: string = DEFAULT_CURRENCY,
): Promise<string> {
  const snapshot = await fetchBusinessSnapshot(db as Database, companyId);
  const now = new Date();

  const fmt = (amount: number) =>
    `${currency} ${amount.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dateStr = now.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let result = `## Your Business (live data as of ${dateStr})

Customers: ${snapshot.customers} active | Vendors: ${snapshot.vendors} active
Products: ${snapshot.productCount} | Services: ${snapshot.serviceCount}

Revenue this month: ${fmt(snapshot.revenueThisMonth)} (${snapshot.revenueThisMonthCount} invoices)
Revenue this year: ${fmt(snapshot.revenueThisYear)}
Outstanding invoices: ${snapshot.outstandingCount} (${fmt(snapshot.outstandingTotal)})
Overdue invoices: ${snapshot.overdueCount} (${fmt(snapshot.overdueTotal)})
Drafts pending: ${snapshot.draftsCount} (${fmt(snapshot.draftsTotal)})`;

  // Bank balances
  if (snapshot.bankBalances.length > 0) {
    result += "\n\nBank accounts:";
    for (const account of snapshot.bankBalances) {
      const ibanShort = account.iban ? `...${account.iban.slice(-4)}` : "";
      result += `\n- ${account.name}${ibanShort ? ` (${ibanShort})` : ""}: ${fmt(Number(account.balance))}`;
    }
  }

  // Recent activity
  if (snapshot.recentDocuments.length > 0) {
    result += "\n\nRecent activity:";
    for (const doc of snapshot.recentDocuments) {
      const contact = doc.contactName || "no contact";
      const due = doc.dueDate
        ? `, due ${new Date(doc.dueDate).toLocaleDateString(DEFAULT_LOCALE)}`
        : "";
      result += `\n- ${doc.number}: ${fmt(Number(doc.total))} to ${contact} (${doc.status}${due})`;
    }
  }

  return result;
}
