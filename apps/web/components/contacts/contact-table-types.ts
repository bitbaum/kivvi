export interface ContactItem {
  id: string;
  contactNumber: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  isActive: boolean | null;
  lastDocumentAt?: Date | null;
}

export interface ContactTableTranslations {
  columnLabels: {
    number: string;
    name: string;
    type: string;
    email: string;
    phone: string;
    city: string;
    lastDocument: string;
    status: string;
    active: string;
    inactive: string;
  };
  typeLabels: Record<string, string>;
  bulkLabels: Record<string, string>;
  quickActionLabels: {
    ariaLabel: string;
    createInvoice: string;
    createQuote: string;
    createOrder: string;
    createPurchaseOrder: string;
    createPurchaseInvoice: string;
    sendEmail: string;
    view: string;
    edit: string;
  };
}
