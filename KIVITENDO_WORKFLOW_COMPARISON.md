# Kivitendo vs Kivvi: Complete Workflow Comparison

**Generated:** 2026-02-12
**Purpose:** Comprehensive analysis of all Kivitendo workflows and their implementation status in Kivvi

---

## Executive Summary

Kivvi implements **most core workflows** from Kivitendo with modern improvements. Missing features are primarily advanced/niche functionality that may not be needed for Revamp IT's operations.

**Coverage:** ~85% of core workflows ✅
**Critical gaps:** Recurring invoices, ZUGFeRD, Webshop API, Time recording integration

---

## 1. Sales Workflows

### Document Conversion Flow

| Kivitendo | Kivvi | Status | Notes |
|-----------|-------|--------|-------|
| Angebot (Quote) | Quote | ✅ **Implemented** | Full CRUD + conversion |
| Auftrag (Order) | Order | ✅ **Implemented** | Full CRUD + conversion |
| Auftragsbestätigung | Order Confirmation | ✅ **Implemented** | Created via order conversion |
| Lieferschein (Delivery Note) | Delivery Note | ✅ **Implemented** | Full CRUD + conversion |
| Rechnung (Invoice) | Invoice | ✅ **Implemented** | Full CRUD + QR-bill |
| Gutschrift (Credit Note) | Credit Note | ✅ **Implemented** | Created via invoice conversion |

**Conversion Paths (Kivvi):**
```
Quote → Order → Invoice
Quote → Invoice (direct)
Order → Order Confirmation → Delivery Note → Invoice
Order → Delivery Note → Invoice
Order → Invoice (direct)
Delivery Note → Invoice
Invoice → Credit Note
```

**Status:** ✅ **COMPLETE** - All document types and conversions match Kivitendo

---

## 2. Dunning (Mahnwesen)

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Dunning levels | 3 levels | 3 levels (dunning_1, dunning_2, dunning_3) | ✅ **Implemented** |
| Automatic detection | Yes | Yes (via `detectOverdueInvoices()`) | ✅ **Implemented** |
| Dunning documents | Yes | Yes (separate document type) | ✅ **Implemented** |
| Escalation workflow | Manual/Auto | Manual trigger | ⚠️ **Partial** |
| Dunning fees | Configurable | Not implemented | ❌ **Missing** |

**Status:** ⚠️ **MOSTLY COMPLETE** - Core dunning works, missing automated escalation and fees

---

## 3. Recurring Invoices

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Recurring invoice setup | ✅ Orders → Auto invoices | Not implemented | ❌ **Missing** |
| Periodicity (monthly/quarterly/annual) | ✅ Configurable | Not implemented | ❌ **Missing** |
| Start/end dates | ✅ Yes | Not implemented | ❌ **Missing** |
| Auto-extension | ✅ Yes | Not implemented | ❌ **Missing** |
| Variable substitution | ✅ `<%period_start_date%>` etc. | Not implemented | ❌ **Missing** |
| Task-Server execution | ✅ Background job | Not implemented | ❌ **Missing** |
| Email automation | ✅ Yes | Partial (manual email) | ⚠️ **Partial** |

**Status:** ❌ **NOT IMPLEMENTED** - Major gap if Revamp IT uses subscriptions/recurring billing

**Priority:** HIGH if recurring billing is used, LOW otherwise

---

## 4. Purchasing Workflows

| Kivitendo | Kivvi | Status | Notes |
|-----------|-------|--------|-------|
| Lieferantenanfrage (Supplier Request) | Not implemented | ❌ **Missing** | Niche feature |
| Bestellung (Purchase Order) | Purchase Order | ✅ **Implemented** | Full CRUD |
| Eingangsrechnung (Purchase Invoice) | Purchase Invoice | ✅ **Implemented** | Full CRUD + reconciliation |
| Purchase Order → Invoice conversion | ✅ Yes | ✅ **Implemented** | Works via conversion |

**Status:** ✅ **CORE COMPLETE** - Missing only supplier request quotes (rarely used)

---

## 5. Inventory & Warehouse (Lager)

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Multiple warehouses | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Stock levels | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Stock movements | ✅ Yes | ✅ Yes (purchase/sale/adjustment/transfer) | ✅ **Implemented** |
| Serial number tracking | ✅ Yes | ✅ Yes (with status tracking) | ✅ **Implemented** |
| Automatic stock updates | ✅ On document save | ✅ On document save | ✅ **Implemented** |
| Procurement helper/disposition | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Low stock alerts | ✅ Yes | ❌ Not implemented | ❌ **Missing** |

**Status:** ✅ **CORE COMPLETE** - Missing advanced procurement planning features

---

## 6. Accounting & Banking

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Chart of accounts | ✅ SKR04, EUR | ✅ Swiss KMU Kontenrahmen (227 accounts) | ✅ **Implemented** |
| Manual journal entries | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Auto journal entries from invoices | ✅ Yes | ✅ Yes (via accounting-integration.ts) | ✅ **Implemented** |
| Fiscal years & periods | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Period closing | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Bank accounts | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Bank reconciliation | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| SEPA integration | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| CSV import | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| DATEV export | ✅ Yes | ❌ Not implemented | ❌ **Missing** |

**Status:** ✅ **CORE COMPLETE** - Missing SEPA (EU-specific) and DATEV (German accounting software export)

---

## 7. Reports

| Report Type | Kivitendo | Kivvi | Status |
|-------------|-----------|-------|--------|
| Profit & Loss (P&L) | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Balance Sheet | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| VAT report | ✅ Yes | ✅ Yes (Swiss MWST) | ✅ **Implemented** |
| Aging report | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Sales report | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Recurring invoices report | ✅ Yes | ❌ N/A | ❌ **N/A** (no recurring) |

**Status:** ✅ **COMPLETE** for implemented features

---

## 8. Document Management

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| PDF generation | ✅ LaTeX | ✅ Modern libraries | ✅ **Implemented** |
| Swiss QR-bill | ⚠️ Limited | ✅ Full QR payment slip | ✅ **Better than Kivitendo** |
| Print templates | ✅ LaTeX templates | ✅ Code-based templates | ✅ **Implemented** |
| Email sending | ✅ Yes | ✅ Yes (via Resend) | ✅ **Implemented** |
| Email with attachments | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| ZUGFeRD invoices | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Mini-DMS (file attachments) | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Excel templates | ✅ Yes | ❌ Not implemented | ❌ **Missing** |

**Status:** ✅ **CORE COMPLETE** - Missing advanced features (ZUGFeRD, DMS, Excel templates)

---

## 9. Time Recording & Projects

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Projects | ✅ Yes | ✅ Yes (with budget tracking) | ✅ **Implemented** |
| Time recording | ✅ Yes | ❌ Not fully integrated | ⚠️ **Partial** |
| Time → Delivery notes | ✅ Auto conversion | ❌ Not implemented | ❌ **Missing** |
| Project cost tracking | ✅ Yes | ✅ Yes (budget vs actual) | ✅ **Implemented** |

**Status:** ⚠️ **PARTIAL** - Projects exist, time tracking not fully integrated

---

## 10. CRM & Contact Management

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Customers & vendors | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Multiple addresses per contact | ✅ Yes | ✅ Yes (billing/shipping) | ✅ **Implemented** |
| Contact groups | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Custom fields | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Activity tracking | ✅ Basic | ❌ Not implemented | ❌ **Missing** |

**Status:** ✅ **CORE COMPLETE** - Missing advanced CRM features

---

## 11. Integration & Automation

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Background jobs (cron-like) | ✅ Task-Server | ❌ Not implemented | ❌ **Missing** |
| Webshop API | ✅ Order import | ❌ Not implemented | ❌ **Missing** |
| Email import (IMAP) | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| CSV import | ✅ Yes | ✅ Yes (Kivitendo import) | ✅ **Implemented** |
| CSV export | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| API access | ✅ HTTP auth API | ✅ Server Actions (Next.js) | ✅ **Different approach** |

**Status:** ⚠️ **PARTIAL** - Import/export works, missing background jobs and webshop integration

---

## 12. Product Management

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Products & services | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Product groups | ✅ Yes | ✅ Yes (hierarchical) | ✅ **Implemented** |
| Manufacturers | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Price lists | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| Price rules | ✅ Yes | ✅ Yes (fixed/percentage/tiered) | ✅ **Implemented** |
| Multi-language descriptions | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Product images | ✅ Yes | ❌ Not implemented | ❌ **Missing** |

**Status:** ✅ **CORE COMPLETE** - Missing multi-language and images

---

## 13. Complaints & Claims

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Complaints module | ✅ Yes | ❌ Not implemented | ❌ **Missing** |

**Status:** ❌ **NOT IMPLEMENTED**

---

## 14. User Management & Security

| Feature | Kivitendo | Kivvi | Status |
|---------|-----------|-------|--------|
| Multi-user | ✅ Yes | ✅ Yes | ✅ **Implemented** |
| User groups | ✅ Yes | ❌ Not implemented | ❌ **Missing** |
| Permissions | ✅ Configurable | ❌ Basic (all users equal) | ⚠️ **Basic** |
| Multi-tenant | ✅ Mandants | ✅ Companies | ✅ **Implemented** |
| Audit trail | ✅ Yes | ✅ Partial (AI actions) | ⚠️ **Partial** |

**Status:** ⚠️ **BASIC** - Works for single company, needs role-based access control

---

## 15. Unique Kivvi Features (Not in Kivitendo)

| Feature | Description | Value |
|---------|-------------|-------|
| **AI Assistant** | Natural language queries, document creation, data analysis | 🚀 **Major advantage** |
| **Modern UI** | React, TypeScript, Tailwind CSS - responsive & fast | 🚀 **Major advantage** |
| **Swiss-native** | Built for Swiss SMEs (QR-bill, CHF, Swiss chart of accounts) | 🚀 **Better than Kivitendo** |
| **Multi-language UI** | German, French, English with next-intl | 🚀 **Better than Kivitendo** |
| **Cloud-first** | Serverless PostgreSQL (Neon), Vercel deployment | 🚀 **Modern advantage** |
| **Real-time collaboration** | Coming soon (multi-user editing) | 🔜 **Planned** |

---

## Summary: Critical Gaps Analysis

### HIGH PRIORITY (Potential Blockers)

1. **❌ Recurring Invoices** - If Revamp IT has subscriptions/recurring billing
   - **Impact:** Cannot automate monthly/annual invoicing
   - **Workaround:** Create invoices manually each period
   - **Effort to implement:** 2-3 days (background jobs + recurring config)

2. **❌ Background Jobs/Task Server** - For automations
   - **Impact:** No scheduled tasks (recurring invoices, reminders, etc.)
   - **Workaround:** Manual execution or external cron
   - **Effort to implement:** 1-2 days (Vercel Cron integration)

### MEDIUM PRIORITY (Nice to Have)

3. **❌ DATEV Export** - For German accountants (not Swiss)
   - **Impact:** May not be needed for Swiss operations
   - **Workaround:** Manual CSV export + transform
   - **Effort to implement:** 2-3 days

4. **❌ Webshop API Integration** - For e-commerce
   - **Impact:** Cannot auto-import webshop orders
   - **Workaround:** Manual order entry or CSV import
   - **Effort to implement:** 3-5 days

5. **❌ ZUGFeRD Invoices** - Structured e-invoice format
   - **Impact:** Limited for Swiss QR-bill compliance (which Kivvi has)
   - **Workaround:** Use PDF + QR-bill (Swiss standard)
   - **Effort to implement:** 2-3 days

### LOW PRIORITY (Edge Cases)

6. **❌ Mini-DMS** (document attachments)
7. **❌ Complaints module**
8. **❌ Email IMAP import**
9. **❌ User groups & advanced permissions**
10. **❌ Product images & multi-language**

---

## Recommendation for Revamp IT

### Can Kivvi Replace Kivitendo? **YES**, with caveats:

✅ **For most operations**: Invoicing, orders, purchases, inventory, accounting, banking, reports
⚠️ **Check usage**: Do you use recurring invoices? If yes, implement that first
⚠️ **Check integrations**: Do you have webshop integration? If yes, implement API
✅ **For Swiss compliance**: Kivvi is **better** (QR-bill, Swiss chart of accounts)
✅ **For usability**: Kivvi is **significantly better** (modern UI, AI assistant)

### Migration Checklist

- [ ] ✅ Customer & vendor data imported
- [ ] ✅ Product catalog imported
- [ ] ✅ Historical invoices imported (with proper line items)
- [ ] ✅ Chart of accounts configured
- [ ] ✅ Bank accounts configured
- [ ] ❓ **Check:** Do you use recurring invoices? → If yes, implement first
- [ ] ❓ **Check:** Do you need DATEV export? → If yes, implement
- [ ] ❓ **Check:** Do you have webshop? → If yes, implement API integration
- [ ] 🎯 **Test parallel operation** for 2-4 weeks before full cutover

---

## Sources

- [Kivitendo GitHub Repository](https://github.com/kivitendo/kivitendo-erp)
- [Kivitendo Documentation (German)](https://www.kivitendo.de/kivi/doc/html/)
- [Kivitendo Features Chapter](https://www.kivitendo.de/kivi/doc/html/ch03.html)
- [Kivitendo Forum Discussions](https://forum.kivitendo.de/)
- [Kivvi Codebase Analysis](/home/g/dev/kivvi)
