/**
 * Swiss KMU Kontenrahmen account code mappings for automatic journal entries (SSOT).
 *
 * Change account codes here — not in business logic.
 * Client-safe: no DB or server dependencies.
 */

export const ACCOUNT_MAPPINGS = {
  /** Sales invoice sent: Debit AR, Credit Revenue + VAT Payable */
  invoiceSent: {
    debitAccount: "1100", // Debitoren (Accounts Receivable)
    revenueAccount: "3000", // Warenertrag (Revenue)
    vatAccount: "2200", // Geschuldete MWSt (VAT Payable)
  },
  /** Sales credit note sent: reversal of invoice */
  creditNoteSent: {
    debitAccount: "3000", // Warenertrag (Revenue reduction)
    creditAccount: "1100", // Debitoren (AR reduction)
    vatAccount: "2200", // Geschuldete MWSt (VAT reversal)
  },
  /** Payment received for sales invoice */
  paymentReceived: {
    debitAccount: "1020", // Bank
    creditAccount: "1100", // Debitoren
  },
  /** Purchase invoice confirmed: Debit Expense + Input VAT, Credit AP */
  purchaseInvoiceConfirmed: {
    expenseAccount: "4000", // Warenaufwand (COGS/Expense)
    creditAccount: "2000", // Kreditoren (Accounts Payable)
    vatAccount: "1170", // Vorsteuer (Input VAT)
  },
  /** Payment made for purchase invoice */
  paymentMade: {
    debitAccount: "2000", // Kreditoren
    creditAccount: "1020", // Bank
  },
} as const;
