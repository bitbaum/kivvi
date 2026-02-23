import { z } from 'zod';
import Decimal from 'decimal.js';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { getDb } from './utils';

const getProjectDetailsSchema = z.object({
  projectId: z.string().uuid().describe('The UUID of the project to retrieve'),
});

export const getProjectDetailsTool: Tool = {
  name: 'get_project_details',
  description: `Get detailed information about a specific project including its budget, associated contact, linked documents, and financial summary (total revenue and invoiced amounts). Requires the project ID.`,
  parameters: getProjectDetailsSchema,
  requiredPermissions: ['project:read'],
  execute: async (params: z.infer<typeof getProjectDetailsSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { getProject, getProjectSummary, getProjectDocuments } = await import('@kivvi/core');
      const db = getDb(context);
      const currency = context.defaultCurrency;

      const project = await getProject(db, context.companyId, params.projectId);

      if (!project) {
        return {
          success: false,
          error: 'Project not found or you do not have access to it.',
        };
      }

      const [summary, documents] = await Promise.all([
        getProjectSummary(db, context.companyId, params.projectId),
        getProjectDocuments(db, context.companyId, params.projectId),
      ]);

      return {
        success: true,
        message: `Retrieved details for project ${project.name}.`,
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          contactName: project.contactName || null,
          dates: {
            start: project.startDate || null,
            end: project.endDate || null,
          },
          budget: project.budget ? `${currency} ${new Decimal(project.budget).toFixed(2)}` : null,
          financial: {
            totalDocuments: summary.totalDocuments,
            totalRevenue: `${currency} ${new Decimal(summary.totalRevenue).toFixed(2)}`,
            totalInvoiced: `${currency} ${new Decimal(summary.totalInvoiced).toFixed(2)}`,
          },
          recentDocuments: documents.slice(0, 5).map((doc) => ({
            id: doc.id,
            number: doc.number,
            type: doc.type,
            status: doc.status,
            total: `${currency} ${new Decimal(doc.total).toFixed(2)}`,
            contactName: doc.contactName,
            date: doc.issueDate.toISOString().split('T')[0],
          })),
        },
        actions: [
          {
            label: 'View Project',
            action: 'navigate',
            params: { url: `/projects/${project.id}` },
            variant: 'primary',
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get project details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
