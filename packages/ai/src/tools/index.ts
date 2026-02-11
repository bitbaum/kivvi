import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

// Re-export all tools
export { searchInvoicesTool } from './search-invoices';
export { searchCustomersTool } from './search-customers';
export { getInvoiceDetailsTool } from './get-invoice-details';
export { getCustomerDetailsTool } from './get-customer-details';
export { createDocumentTool } from './create-document';
export { updateDocumentStatusTool } from './update-document-status';
export { searchProductsTool } from './search-products';
export { getFinancialSummaryTool } from './get-financial-summary';

// Import for getDefaultTools
import { searchInvoicesTool } from './search-invoices';
import { searchCustomersTool } from './search-customers';
import { getInvoiceDetailsTool } from './get-invoice-details';
import { getCustomerDetailsTool } from './get-customer-details';
import { createDocumentTool } from './create-document';
import { updateDocumentStatusTool } from './update-document-status';
import { searchProductsTool } from './search-products';
import { getFinancialSummaryTool } from './get-financial-summary';

/**
 * Get default tools for the ERP system
 */
export function getDefaultTools(): Tool[] {
  return [
    searchInvoicesTool,
    searchCustomersTool,
    getInvoiceDetailsTool,
    getCustomerDetailsTool,
    createDocumentTool,
    updateDocumentStatusTool,
    searchProductsTool,
    getFinancialSummaryTool,
  ];
}

/**
 * Get tools filtered by user permissions
 */
export function getToolsForPermissions(permissions: string[]): Tool[] {
  const allTools = getDefaultTools();

  return allTools.filter((tool) => {
    // Read-only tools: require read permission for their domain
    if (tool.name.includes('invoice') && !tool.name.includes('create') && !tool.name.includes('update')) {
      if (!permissions.includes('invoice:read')) return false;
    }
    if (tool.name.includes('customer') && !permissions.includes('contact:read')) {
      return false;
    }
    if (tool.name.includes('banking') && !permissions.includes('banking:read')) {
      return false;
    }

    // Write tools: require write permission
    if (tool.name === 'create_document' && !permissions.includes('invoice:write')) {
      return false;
    }
    if (tool.name === 'update_document_status' && !permissions.includes('invoice:write')) {
      return false;
    }

    // Product search: accessible to anyone with contact:read (all users can search)
    if (tool.name === 'search_products' && !permissions.includes('contact:read')) {
      return false;
    }

    // Financial summary: requires invoice:read
    if (tool.name === 'get_financial_summary' && !permissions.includes('invoice:read')) {
      return false;
    }

    return true;
  });
}
