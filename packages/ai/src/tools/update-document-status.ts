// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const updateDocumentStatusSchema = z.object({
  documentId: z.string().uuid().describe('The UUID of the document to update'),
  newStatus: z.enum([
    'draft', 'sent', 'confirmed', 'delivered',
    'paid', 'partially_paid', 'overdue', 'cancelled',
    'dunning_1', 'dunning_2', 'dunning_3',
  ]).describe('The new status for the document'),
});

/**
 * Valid status transitions for documents.
 * Key = current status, Value = array of allowed next statuses.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'paid', 'partially_paid', 'overdue', 'cancelled'],
  confirmed: ['delivered', 'paid', 'partially_paid', 'overdue', 'cancelled'],
  delivered: ['paid', 'partially_paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'partially_paid', 'dunning_1', 'cancelled'],
  dunning_1: ['paid', 'partially_paid', 'dunning_2', 'cancelled'],
  dunning_2: ['paid', 'partially_paid', 'dunning_3', 'cancelled'],
  dunning_3: ['paid', 'partially_paid', 'cancelled'],
  paid: [], // Terminal state
  cancelled: [], // Terminal state
};

export const updateDocumentStatusTool: Tool = {
  name: 'update_document_status',
  description: `Update the status of a document (invoice, quote, order, etc.). Validates that the status transition is allowed. For example: draft → sent, sent → paid. Terminal statuses (paid, cancelled) cannot be changed.`,
  parameters: updateDocumentStatusSchema,
  execute: async (params: z.infer<typeof updateDocumentStatusSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, documents } = await import('@kivvi/database');
      const { eq, and } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      // Find the document
      const doc = await db.query.documents.findFirst({
        where: and(
          eq(documents.id, params.documentId),
          eq(documents.companyId, context.companyId)
        ),
        with: { contact: true },
      });

      if (!doc) {
        return {
          success: false,
          error: 'Document not found or you do not have access to it.',
        };
      }

      // Validate the status transition
      const currentStatus = doc.status;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(params.newStatus)) {
        const allowedList = allowedTransitions.length > 0
          ? allowedTransitions.join(', ')
          : 'none (terminal status)';

        return {
          success: false,
          error: `Cannot transition from "${currentStatus}" to "${params.newStatus}". Allowed transitions: ${allowedList}.`,
        };
      }

      // Build the update payload
      const updateData: Record<string, any> = {
        status: params.newStatus,
        updatedAt: new Date(),
      };

      // Set paidDate when marking as paid
      if (params.newStatus === 'paid') {
        updateData.paidDate = new Date();
      }

      // Update the document
      const [updated] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, params.documentId))
        .returning();

      return {
        success: true,
        message: `Updated ${doc.number} status from "${currentStatus}" to "${params.newStatus}".`,
        data: {
          id: updated.id,
          number: updated.number,
          type: updated.type,
          previousStatus: currentStatus,
          newStatus: updated.status,
          customer: doc.contact?.name || 'Unknown',
          total: `${updated.currency} ${Number(updated.total).toFixed(2)}`,
          paidDate: updated.paidDate?.toISOString().split('T')[0] || null,
        },
        actions: [
          {
            label: 'View Document',
            action: 'navigate',
            params: { url: `/sales/${updated.id}` },
            variant: 'primary',
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update document status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
