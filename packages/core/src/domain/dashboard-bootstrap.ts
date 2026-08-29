import { eq, count } from "drizzle-orm";
import {
  companies,
  contacts,
  documents,
  inventoryItems,
  memberships,
  bankAccounts,
} from "@kivvi/database";
import type { Database, Company } from "@kivvi/database";

export interface ChecklistState {
  hasIntake: boolean;
  hasInvoice: boolean;
  hasBankAccount: boolean;
  hasTeamMember: boolean;
  hasShopUrl: boolean;
  companyAgeDays: number;
}

export interface DashboardBootstrap {
  company: Company | undefined;
  contactCount: number;
  documentCount: number;
  checklistState: ChecklistState;
}

export async function getDashboardBootstrap(
  db: Database,
  companyId: string,
): Promise<DashboardBootstrap> {
  const [company, [contactRow], [documentRow], [inventoryRow], [memberRow], [bankRow]] =
    await Promise.all([
      db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
      db.select({ value: count() }).from(contacts).where(eq(contacts.companyId, companyId)),
      db.select({ value: count() }).from(documents).where(eq(documents.companyId, companyId)),
      db
        .select({ value: count() })
        .from(inventoryItems)
        .where(eq(inventoryItems.companyId, companyId)),
      db.select({ value: count() }).from(memberships).where(eq(memberships.companyId, companyId)),
      db
        .select({ iban: bankAccounts.iban })
        .from(bankAccounts)
        .where(eq(bankAccounts.companyId, companyId))
        .limit(1),
    ]);

  const settings = company?.settings ?? {};
  const documentCount = documentRow?.value ?? 0;
  const companyAgeDays = company?.createdAt
    ? Math.floor((Date.now() - company.createdAt.getTime()) / 86_400_000)
    : 999;

  return {
    company,
    contactCount: contactRow?.value ?? 0,
    documentCount,
    checklistState: {
      hasIntake: (inventoryRow?.value ?? 0) > 0,
      hasInvoice: documentCount > 0,
      hasBankAccount: !!(bankRow?.iban || settings.bankAccount?.iban),
      hasTeamMember: (memberRow?.value ?? 0) > 1,
      hasShopUrl: !!company?.slug,
      companyAgeDays,
    },
  };
}
