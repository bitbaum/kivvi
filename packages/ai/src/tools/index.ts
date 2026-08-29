import type { Tool } from "../types";

import { searchInvoicesTool } from "./search-invoices";
import { searchCustomersTool } from "./search-customers";
import { getInvoiceDetailsTool } from "./get-invoice-details";
import { getCustomerDetailsTool } from "./get-customer-details";
import { createDocumentTool } from "./create-document";
import { updateDocumentStatusTool } from "./update-document-status";
import { convertDocumentTool } from "./convert-document";
import { searchProductsTool } from "./search-products";
import { getFinancialSummaryTool } from "./get-financial-summary";
import { getReportTool } from "./get-report";
import { recordPaymentTool } from "./record-payment";
import { listOverdueInvoicesTool } from "./list-overdue-invoices";
import { getStockLevelsTool } from "./get-stock-levels";
import { getBankSummaryTool } from "./get-bank-summary";
import { searchProjectsTool } from "./search-projects";
import { getProjectDetailsTool } from "./get-project-details";
import { createContactTool } from "./create-contact";
import { updateContactTool } from "./update-contact";
import { createProductTool } from "./create-product";
import { updateProductTool } from "./update-product";
import { getAccountBalancesTool } from "./get-account-balances";
import { createJournalEntryTool } from "./create-journal-entry";
import { recordStockMovementTool } from "./manage-inventory";
import { getRecurringInvoicesTool } from "./get-recurring-invoices";
import { processDunningTool } from "./process-dunning";
import { reconcileTransactionTool } from "./reconcile-transaction";
import { getDashboardSummaryTool } from "./get-dashboard-summary";
import { prepareDocumentTool } from "./prepare-document";
import { searchInventoryTool } from "./search-inventory";
import { getInventoryDashboardTool } from "./get-inventory-dashboard";
import { recordRepairTool } from "./record-repair";
import { recordRepairPartTool } from "./record-repair-part";
import { updateItemStatusTool, updateItemConditionTool } from "./update-item-status";
import { recordDataErasureTool } from "./record-data-erasure";
import { getItemDetailsTool } from "./get-item-details";
import { recordChecklistTool } from "./record-checklist";
import { intakeInventoryItemTool } from "./intake-inventory-item";
import { returnInventoryItemTool } from "./return-inventory-item";
import { updateInventoryItemTool } from "./update-inventory-item";
import { bulkUpdateItemStatusTool } from "./bulk-update-item-status";
import { getPriceListsTool } from "./get-price-lists";
import { resolveProductPriceTool } from "./resolve-product-price";
import { createPriceRuleTool } from "./create-price-rule";
import { createPriceListTool } from "./create-price-list";
import { searchRepairOrdersTool } from "./search-repair-orders";
import { classifyPaymentTool } from "./classify-payment";
import { findUninvoicedRepairLaborTool } from "./find-uninvoiced-repair-labor";

export {
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
  createContactTool,
  updateContactTool,
  createProductTool,
  updateProductTool,
  getAccountBalancesTool,
  createJournalEntryTool,
  recordStockMovementTool,
  getRecurringInvoicesTool,
  processDunningTool,
  reconcileTransactionTool,
  getDashboardSummaryTool,
  prepareDocumentTool,
  searchInventoryTool,
  getInventoryDashboardTool,
  recordRepairTool,
  recordRepairPartTool,
  updateItemStatusTool,
  updateItemConditionTool,
  recordDataErasureTool,
  getItemDetailsTool,
  recordChecklistTool,
  intakeInventoryItemTool,
  returnInventoryItemTool,
  updateInventoryItemTool,
  bulkUpdateItemStatusTool,
  getPriceListsTool,
  resolveProductPriceTool,
  createPriceRuleTool,
  createPriceListTool,
  searchRepairOrdersTool,
  classifyPaymentTool,
  findUninvoicedRepairLaborTool,
};

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
    createContactTool,
    updateContactTool,
    createProductTool,
    updateProductTool,
    getAccountBalancesTool,
    createJournalEntryTool,
    recordStockMovementTool,
    getRecurringInvoicesTool,
    processDunningTool,
    reconcileTransactionTool,
    getDashboardSummaryTool,
    prepareDocumentTool,
    searchInventoryTool,
    getInventoryDashboardTool,
    recordRepairTool,
    recordRepairPartTool,
    updateItemStatusTool,
    updateItemConditionTool,
    recordDataErasureTool,
    getItemDetailsTool,
    recordChecklistTool,
    intakeInventoryItemTool,
    returnInventoryItemTool,
    updateInventoryItemTool,
    bulkUpdateItemStatusTool,
    getPriceListsTool,
    resolveProductPriceTool,
    createPriceRuleTool,
    createPriceListTool,
    searchRepairOrdersTool,
    classifyPaymentTool,
    findUninvoicedRepairLaborTool,
  ];
}

export function getToolsForPermissions(permissions: string[]): Tool[] {
  return getDefaultTools().filter((tool) =>
    tool.requiredPermissions.every((p) => permissions.includes(p)),
  );
}
