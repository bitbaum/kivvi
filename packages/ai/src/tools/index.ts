import type { Tool } from '../types';

// Re-export all tools
export { searchInvoicesTool } from './search-invoices';
export { searchCustomersTool } from './search-customers';
export { getInvoiceDetailsTool } from './get-invoice-details';
export { getCustomerDetailsTool } from './get-customer-details';
export { createDocumentTool } from './create-document';
export { updateDocumentStatusTool } from './update-document-status';
export { convertDocumentTool } from './convert-document';
export { searchProductsTool } from './search-products';
export { getFinancialSummaryTool } from './get-financial-summary';
export { getReportTool } from './get-report';
export { recordPaymentTool } from './record-payment';
export { listOverdueInvoicesTool } from './list-overdue-invoices';
export { getStockLevelsTool } from './get-stock-levels';
export { getBankSummaryTool } from './get-bank-summary';
export { searchProjectsTool } from './search-projects';
export { getProjectDetailsTool } from './get-project-details';

// Import for getDefaultTools
import { searchInvoicesTool } from './search-invoices';
import { searchCustomersTool } from './search-customers';
import { getInvoiceDetailsTool } from './get-invoice-details';
import { getCustomerDetailsTool } from './get-customer-details';
import { createDocumentTool } from './create-document';
import { updateDocumentStatusTool } from './update-document-status';
import { convertDocumentTool } from './convert-document';
import { searchProductsTool } from './search-products';
import { getFinancialSummaryTool } from './get-financial-summary';
import { getReportTool } from './get-report';
import { recordPaymentTool } from './record-payment';
import { listOverdueInvoicesTool } from './list-overdue-invoices';
import { getStockLevelsTool } from './get-stock-levels';
import { getBankSummaryTool } from './get-bank-summary';
import { searchProjectsTool } from './search-projects';
import { getProjectDetailsTool } from './get-project-details';

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
    convertDocumentTool,
    searchProductsTool,
    getFinancialSummaryTool,
    getReportTool,
    recordPaymentTool,
    listOverdueInvoicesTool,
    getStockLevelsTool,
    getBankSummaryTool,
    searchProjectsTool,
    getProjectDetailsTool,
  ];
}

/**
 * Get tools filtered by user permissions.
 * Each tool declares its own requiredPermissions — no heuristics needed.
 */
export function getToolsForPermissions(permissions: string[]): Tool[] {
  return getDefaultTools().filter((tool) =>
    tool.requiredPermissions.every((p) => permissions.includes(p))
  );
}
