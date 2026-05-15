import { eq } from "drizzle-orm";
import { companies } from "@kivvi/database";
import type { Database, Company, CompanySettings } from "@kivvi/database";

export async function getCompany(
  db: Database,
  companyId: string,
): Promise<Company | undefined> {
  return db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
}

export async function getCompanySettings(
  db: Database,
  companyId: string,
): Promise<CompanySettings> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true },
  });
  return (company?.settings as CompanySettings) ?? {};
}
