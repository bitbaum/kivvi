import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import {
  companies,
  contacts,
  contactAddresses,
  products,
  productGroups,
  manufacturers,
  documents,
  documentItems,
  documentPayments,
  accounts,
  journalEntries,
  journalLines,
  bankAccounts,
  bankTransactions,
  projects,
  warehouses,
  stockLevels,
  numberSequences,
  fiscalYears,
  fiscalPeriods,
} from '@kivvi/database';

/**
 * Full data export for GDPR compliance.
 * Returns all company data as a downloadable JSON file.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = session.user.companyId;

  // Phase 1: Fetch all tables that have companyId directly
  const [
    companyData,
    contactsData,
    productsData,
    groupsData,
    manufacturersData,
    documentsData,
    accountsData,
    entriesData,
    bankAccountsData,
    projectsData,
    warehousesData,
    sequencesData,
    fiscalYearsData,
  ] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)),
    db.select().from(contacts).where(eq(contacts.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(productGroups).where(eq(productGroups.companyId, companyId)),
    db.select().from(manufacturers).where(eq(manufacturers.companyId, companyId)),
    db.select().from(documents).where(eq(documents.companyId, companyId)),
    db.select().from(accounts).where(eq(accounts.companyId, companyId)),
    db.select().from(journalEntries).where(eq(journalEntries.companyId, companyId)),
    db.select().from(bankAccounts).where(eq(bankAccounts.companyId, companyId)),
    db.select().from(projects).where(eq(projects.companyId, companyId)),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(numberSequences).where(eq(numberSequences.companyId, companyId)),
    db.select().from(fiscalYears).where(eq(fiscalYears.companyId, companyId)),
  ]);

  // Phase 2: Fetch child tables via parent IDs
  const contactIds = contactsData.map((c) => c.id);
  const docIds = documentsData.map((d) => d.id);
  const entryIds = entriesData.map((e) => e.id);
  const bankAccountIds = bankAccountsData.map((a) => a.id);
  const warehouseIds = warehousesData.map((w) => w.id);
  const productIds = productsData.map((p) => p.id);
  const fiscalYearIds = fiscalYearsData.map((fy) => fy.id);

  const [
    addressesData,
    itemsData,
    paymentsData,
    linesData,
    transactionsData,
    stockData,
    periodsData,
  ] = await Promise.all([
    contactIds.length > 0
      ? db.select().from(contactAddresses).where(inArray(contactAddresses.contactId, contactIds))
      : Promise.resolve([]),
    docIds.length > 0
      ? db.select().from(documentItems).where(inArray(documentItems.documentId, docIds))
      : Promise.resolve([]),
    docIds.length > 0
      ? db.select().from(documentPayments).where(inArray(documentPayments.documentId, docIds))
      : Promise.resolve([]),
    entryIds.length > 0
      ? db.select().from(journalLines).where(inArray(journalLines.journalEntryId, entryIds))
      : Promise.resolve([]),
    bankAccountIds.length > 0
      ? db.select().from(bankTransactions).where(inArray(bankTransactions.bankAccountId, bankAccountIds))
      : Promise.resolve([]),
    warehouseIds.length > 0 && productIds.length > 0
      ? db.select().from(stockLevels).where(inArray(stockLevels.warehouseId, warehouseIds))
      : Promise.resolve([]),
    fiscalYearIds.length > 0
      ? db.select().from(fiscalPeriods).where(inArray(fiscalPeriods.fiscalYearId, fiscalYearIds))
      : Promise.resolve([]),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    company: companyData[0] ?? null,
    contacts: contactsData,
    contactAddresses: addressesData,
    products: productsData,
    productGroups: groupsData,
    manufacturers: manufacturersData,
    documents: documentsData,
    documentItems: itemsData,
    documentPayments: paymentsData,
    accounts: accountsData,
    journalEntries: entriesData,
    journalLines: linesData,
    bankAccounts: bankAccountsData,
    bankTransactions: transactionsData,
    projects: projectsData,
    warehouses: warehousesData,
    stockLevels: stockData,
    numberSequences: sequencesData,
    fiscalYears: fiscalYearsData,
    fiscalPeriods: periodsData,
  };

  const json = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().split('T')[0];

  return new Response(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="kivvi-export-${date}.json"`,
    },
  });
}
