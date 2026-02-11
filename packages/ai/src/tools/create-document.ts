// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const documentItemSchema = z.object({
  description: z.string().describe('Line item description'),
  quantity: z.number().positive().describe('Quantity'),
  unitPrice: z.number().nonnegative().describe('Unit price in the company default currency'),
  vatRate: z.number().default(8.1).describe('VAT rate as percentage (e.g. 8.1 for standard Swiss VAT)'),
  discount: z.number().min(0).max(100).default(0).describe('Discount percentage (0-100)'),
});

const createDocumentSchema = z.object({
  type: z.enum([
    'invoice', 'quote', 'order', 'order_confirmation',
    'delivery_note', 'credit_note', 'purchase_order', 'purchase_invoice',
  ]).describe('The type of document to create'),
  contactId: z.string().uuid().describe('The UUID of the customer/vendor contact'),
  items: z.array(documentItemSchema).min(1).describe('Line items for the document'),
  issueDate: z.string().optional().describe('Issue date (ISO 8601). Defaults to today.'),
  dueDate: z.string().optional().describe('Due date (ISO 8601). Defaults to issue date + contact payment terms.'),
  notes: z.string().optional().describe('Notes or remarks to include on the document'),
});

export const createDocumentTool: Tool = {
  name: 'create_document',
  description: `Create a new document (invoice, quote, order, credit note, etc.) with line items. The document is always created in draft status so the user can review before sending. Requires a contact ID and at least one line item.`,
  parameters: createDocumentSchema,
  execute: async (params: z.infer<typeof createDocumentSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, documents, documentItems, contacts, numberSequences } = await import('@kivvi/database');
      const { eq, and } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      // Verify the contact exists and belongs to this company
      const contact = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, params.contactId),
            eq(contacts.companyId, context.companyId)
          )
        )
        .limit(1);

      if (contact.length === 0) {
        return {
          success: false,
          error: 'Contact not found or you do not have access to it.',
        };
      }

      // Generate document number via number sequences
      const existing = await db
        .select()
        .from(numberSequences)
        .where(
          and(
            eq(numberSequences.companyId, context.companyId),
            eq(numberSequences.type, params.type)
          )
        )
        .limit(1);

      let sequence = existing[0];

      const SEQUENCE_DEFAULTS: Record<string, { prefix: string; format: string }> = {
        invoice: { prefix: 'RE', format: '{prefix}-{year}-{number:5}' },
        quote: { prefix: 'AN', format: '{prefix}-{year}-{number:5}' },
        order: { prefix: 'AU', format: '{prefix}-{year}-{number:5}' },
        order_confirmation: { prefix: 'AB', format: '{prefix}-{year}-{number:5}' },
        delivery_note: { prefix: 'LS', format: '{prefix}-{year}-{number:5}' },
        credit_note: { prefix: 'GU', format: '{prefix}-{year}-{number:5}' },
        purchase_order: { prefix: 'BE', format: '{prefix}-{year}-{number:5}' },
        purchase_invoice: { prefix: 'ER', format: '{prefix}-{year}-{number:5}' },
      };

      const defaults = SEQUENCE_DEFAULTS[params.type];
      if (!defaults) {
        return {
          success: false,
          error: `Unsupported document type: ${params.type}`,
        };
      }

      if (!sequence) {
        const [created] = await db
          .insert(numberSequences)
          .values({
            companyId: context.companyId,
            type: params.type,
            prefix: defaults.prefix,
            nextNumber: 1,
            format: defaults.format,
          })
          .returning();
        sequence = created;
      }

      // Format the document number
      const year = new Date().getFullYear().toString();
      const documentNumber = sequence.format
        .replace('{prefix}', sequence.prefix)
        .replace('{year}', year)
        .replace(/\{number:(\d+)\}/, (_, digits) => {
          return sequence.nextNumber.toString().padStart(parseInt(digits), '0');
        });

      // Increment the sequence
      await db
        .update(numberSequences)
        .set({ nextNumber: sequence.nextNumber + 1 })
        .where(eq(numberSequences.id, sequence.id));

      // Calculate totals for each item and the document
      const calculatedItems = params.items.map((item, index) => {
        const discountMultiplier = 1 - (item.discount / 100);
        const lineTotal = item.quantity * item.unitPrice * discountMultiplier;
        return {
          position: index + 1,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toFixed(2),
          discount: item.discount.toFixed(2),
          vatRate: item.vatRate.toFixed(2),
          total: lineTotal.toFixed(2),
        };
      });

      const subtotal = calculatedItems.reduce((sum, item) => sum + Number(item.total), 0);
      const vatAmount = calculatedItems.reduce((sum, item) => {
        return sum + Number(item.total) * (Number(item.vatRate) / 100);
      }, 0);
      const total = subtotal + vatAmount;

      // Determine dates
      const issueDate = params.issueDate ? new Date(params.issueDate) : new Date();
      let dueDate: Date | undefined;
      if (params.dueDate) {
        dueDate = new Date(params.dueDate);
      } else if (contact[0].paymentTermsDays) {
        dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + contact[0].paymentTermsDays);
      }

      // Insert the document
      const [doc] = await db
        .insert(documents)
        .values({
          companyId: context.companyId,
          contactId: params.contactId,
          type: params.type,
          status: 'draft',
          number: documentNumber,
          issueDate,
          dueDate: dueDate || null,
          currency: context.defaultCurrency,
          subtotal: subtotal.toFixed(2),
          vatAmount: vatAmount.toFixed(2),
          total: total.toFixed(2),
          notes: params.notes || null,
          createdBy: context.userId,
        })
        .returning();

      // Insert line items
      await db
        .insert(documentItems)
        .values(
          calculatedItems.map((item) => ({
            documentId: doc.id,
            position: item.position,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            vatRate: item.vatRate,
            total: item.total,
          }))
        );

      const typeLabels: Record<string, string> = {
        invoice: 'Invoice',
        quote: 'Quote',
        order: 'Order',
        order_confirmation: 'Order Confirmation',
        delivery_note: 'Delivery Note',
        credit_note: 'Credit Note',
        purchase_order: 'Purchase Order',
        purchase_invoice: 'Purchase Invoice',
      };

      return {
        success: true,
        message: `Created ${typeLabels[params.type] || params.type} ${documentNumber} as draft.`,
        data: {
          id: doc.id,
          number: documentNumber,
          type: params.type,
          status: 'draft',
          customer: contact[0].name,
          issueDate: issueDate.toISOString().split('T')[0],
          dueDate: dueDate?.toISOString().split('T')[0] || null,
          itemCount: calculatedItems.length,
          subtotal: `${context.defaultCurrency} ${subtotal.toFixed(2)}`,
          vat: `${context.defaultCurrency} ${vatAmount.toFixed(2)}`,
          total: `${context.defaultCurrency} ${total.toFixed(2)}`,
        },
        actions: [
          {
            label: 'View Document',
            action: 'navigate',
            params: { url: `/sales/${doc.id}` },
            variant: 'primary',
          },
          {
            label: 'Edit Document',
            action: 'navigate',
            params: { url: `/sales/${doc.id}/edit` },
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
