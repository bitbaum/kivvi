// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const getCustomerDetailsSchema = z.object({
  customerId: z.string().uuid().describe('The UUID of the customer/contact to retrieve'),
});

export const getCustomerDetailsTool: Tool = {
  name: 'get_customer_details',
  description: `Get detailed information about a specific customer or vendor including their address, contact info, payment terms, and recent document history. Requires the customer ID.`,
  parameters: getCustomerDetailsSchema,
  execute: async (params: z.infer<typeof getCustomerDetailsSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, contacts, documents } = await import('@kivvi/database');
      const { eq, and, desc } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      const contact = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.id, params.customerId),
          eq(contacts.companyId, context.companyId)
        ),
        with: {
          documents: {
            orderBy: [desc(documents.issueDate)],
            limit: 10,
          },
          addresses: true,
        },
      });

      if (!contact) {
        return {
          success: false,
          error: 'Customer not found or you do not have access.',
        };
      }

      const invoices = contact.documents.filter((d) => d.type === 'invoice');
      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const unpaidInvoices = invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled');
      const overdueInvoices = unpaidInvoices.filter((inv) => inv.dueDate && new Date(inv.dueDate) < new Date());

      return {
        success: true,
        message: `Retrieved details for ${contact.name}.`,
        data: {
          id: contact.id,
          contactNumber: contact.contactNumber,
          name: contact.name,
          firstName: contact.firstName,
          lastName: contact.lastName,
          type: contact.type,
          contact: {
            email: contact.email,
            phone: contact.phone,
            mobile: contact.mobile,
            website: contact.website,
          },
          address: {
            street: contact.address,
            city: contact.city,
            postalCode: contact.postalCode,
            country: contact.country,
          },
          additionalAddresses: contact.addresses.map((a) => ({
            type: a.type,
            name: a.name,
            address: a.address,
            city: a.city,
            postalCode: a.postalCode,
            country: a.country,
          })),
          financial: {
            vatNumber: contact.vatNumber,
            iban: contact.iban,
            paymentTermsDays: contact.paymentTermsDays,
            creditLimit: contact.creditLimit ? Number(contact.creditLimit) : null,
          },
          stats: {
            totalInvoices: invoices.length,
            totalRevenue: `${context.defaultCurrency} ${totalRevenue.toFixed(2)}`,
            unpaidCount: unpaidInvoices.length,
            overdueCount: overdueInvoices.length,
          },
          recentDocuments: contact.documents.slice(0, 5).map((doc) => ({
            id: doc.id,
            number: doc.number,
            type: doc.type,
            status: doc.status,
            date: doc.issueDate.toISOString().split('T')[0],
            total: `${doc.currency} ${Number(doc.total).toFixed(2)}`,
          })),
          notes: contact.notes,
          language: contact.language,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get customer details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
