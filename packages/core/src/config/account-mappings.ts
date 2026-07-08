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
    serviceRevenueAccount: "3200", // Dienstleistungserlöse (Service revenue)
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
  /**
   * Consignment settlement (principal model): recognize the consignor's share
   * of a sale as cost-of-goods + a payable liability. Fires when a consigned
   * item is sold (invoice sent). Does NOT touch VAT or revenue — the invoice
   * still books full revenue; this only splits out what is owed to the owner.
   * Dr 4200 Handelswarenaufwand / Cr 2140 Übrige kurzfristige Verbindlichkeiten
   */
  consignmentSettlement: {
    expenseAccount: "4200", // Handelswarenaufwand (consignor's share as COGS)
    liabilityAccount: "2140", // Übrige kurzfristige Verbindlichkeiten (payable to consignor)
  },
  /**
   * Consignor payout: settle the accumulated consignor payable from the bank.
   * Dr 2140 Übrige kurzfristige Verbindlichkeiten / Cr 1020 Bank
   */
  consignorPayout: {
    debitAccount: "2140", // Übrige kurzfristige Verbindlichkeiten (reduce payable)
    creditAccount: "1020", // Bank
  },
  /**
   * Marketplace agency (P2P) sale: the platform (e.g. revamp-it) facilitates a
   * sale between a private seller and a buyer. Kivvi books ONLY the platform's
   * own economics — never the full sale price, which belongs to the seller.
   *   Buyer pays gross    → Dr 1020 Bank
   *   Owed to seller      → Cr 2140 Übrige kurzfristige Verbindlichkeiten (pass-through)
   *   Platform commission → Cr 3200 Dienstleistungserlöse
   *   VAT on commission   → Cr 2200 Geschuldete MWST (fee only — never the gross)
   */
  marketplaceAgencySale: {
    bankAccount: "1020", // Bank (funds received)
    liabilityAccount: "2140", // Übrige kurzfristige Verbindlichkeiten (owed to seller)
    commissionRevenueAccount: "3200", // Dienstleistungserlöse (platform fee)
    vatAccount: "2200", // Geschuldete MWST (on the fee only)
  },
  /**
   * Marketplace seller payout: settle the pass-through liability to the private
   * seller once funds are released.
   * Dr 2140 Übrige kurzfristige Verbindlichkeiten / Cr 1020 Bank
   */
  marketplacePayout: {
    debitAccount: "2140", // Übrige kurzfristige Verbindlichkeiten (reduce payable)
    creditAccount: "1020", // Bank
  },
} as const;
