# Kivvi Browser Test Findings — 2026-02-23

Tested as user `georgy.butaev@revamp-it.ch` with RevampIT data migrated from Kivitendo.

---

## P0 — Critical (Blocks Daily Use)

### 1. Duplicate Data from Import (Products, Invoices, Stock)
**Scope**: Products, Invoices, Inventory
- **Products**: "ATX Netzteil 300W 20+4 pin" (000101) appears 5 times, "Arbeitszeit" (D48) appears 5 times. 5036 products total but a large percentage are duplicates.
- **Invoices**: Every invoice appears twice — once with old Kivitendo number (e.g., "9899") and once with new Kivvi number (e.g., "R2026062") for the same customer/amount/date. 1320 invoices listed but ~660 unique.
- **Inventory**: Low stock alerts show duplicates — "Acer 5733 PEW71" appears 6 times, "500 Gb SSD 2.5" appears 4 times.
- **Warehouses**: Two "Hauptlager" warehouses created (one default, one extra from import).
- **Root cause**: Import process creates new records without deduplicating against existing data. Running import multiple times creates multiple copies.
- **Fix**: Need a deduplication script + import idempotency (upsert by Kivitendo ID or article number).

### 2. Invoice Line Items Show Raw Kivitendo Data
**Scope**: Invoice detail pages
- Line item description shows raw Kivitendo export text: "Position Artikelnummer Beschreibung Menge Einheit 1 006811 Logitech C920 Pro HD 1.00 Stck ... ⏷"
- Line item unit price shows CHF 0.00 but invoice total is CHF 57.00 — data not parsed correctly during import.
- **Fix**: Fix CSV import parser to extract description, quantity, and unit price from Kivitendo format.

### 3. Many Documents/Orders Show "No customer"
**Scope**: Invoices, Orders
- Significant portion of imported invoices and orders show "No customer" — customer linkage was lost during import.
- The R2026xxx duplicates consistently have no customer while the Kivitendo-numbered originals do.
- **Fix**: Import should link contacts by Kivitendo ID during document import.

### 4. Dashboard Database Connection Error
**Scope**: Dashboard health-metrics section
- Console error: "Error connecting to database" in `health-metrics.tsx:31:21`
- Shows "1 error" toast on dashboard.
- ErrorBoundary catches it, but metrics section likely shows stale/empty data.
- **Fix**: Investigate database connection in health-metrics component (possibly serverless DB connection timeout).

---

## P1 — Important (UX Issues Impacting Usability)

### 5. Contact Search Input Doesn't Trigger Filter
**Scope**: /contacts
- Typing in the search box doesn't update results — it requires URL-based search (`?search=revamp`).
- The input is "uncontrolled" — no debounce/onChange handler pushes to URL params.
- **Fix**: Add debounced URL update from search input onChange.

### 6. Missing Translation Keys (Multiple Pages)
**Scope**: Settings, Reports, Dashboard, Contact breadcrumb
- **Settings**: `settings.billing.title`, `settings.billing.settingsDesc`, `settings.dataPrivacy.title`, `settings.dataPrivacy.exportTitle`, `settings.dataPrivacy.exportDescription`, `settings.dataPrivacy.downloadButton`
- **Reports/Sales**: `common.export CSV` button label shows raw key
- **Contact detail breadcrumb**: Shows "common.dashboard" instead of "Dashboard"
- **Dashboard alerts/metrics**: Mix of German ("Überfällige Rechnungen") and English ("View details") — inconsistent locale
- **Fix**: Add missing keys to en.json and de.json translation files.

### 7. Inconsistent Status Display Between Pages
**Scope**: Documents hub vs Invoices page
- Documents hub shows invoices as "Sent" while the Invoices page shows same invoices as "Overdue".
- Dashboard "Überfällige Rechnungen" shows CHF 558'778.50 (1228 items) but "Überfällige Rechnungen" in Key Metrics shows CHF 0.00.
- Dashboard "Umsatz dieses Jahr" shows CHF 341.00 but Sales Report shows CHF 2,258.03.
- **Root cause**: Documents hub likely uses raw status from DB, while invoices page derives "overdue" from due date. Dashboard metrics may use different calculation logic.
- **Fix**: Unify overdue calculation — either store computed status or derive consistently everywhere.

### 8. Login Flow UX Issue
**Scope**: /login
- Login button shows "Signing in..." spinner indefinitely (from previous test — the auth actually works but the UI doesn't recover).
- `signIn()` call from next-auth/react may hang if auth succeeds but `router.push()` takes long with 2700+ documents to render.
- **Fix**: Add timeout handling to login form, investigate slow redirect after auth.

---

## P2 — Medium (Quality/Polish Issues)

### 9. Revenue Trend Chart Not Rendering
**Scope**: Dashboard
- Recharts warnings: "The width(-1) and height(-1) of chart should be positive"
- Revenue Trend chart area appears blank on initial load.
- **Fix**: Ensure chart container has explicit dimensions or use ResponsiveContainer correctly.

### 10. Invoice Date Import Issues
**Scope**: Invoice detail
- Due date = Issue date for many imported invoices (both 10.2.2026) — payment terms not applied during import.
- **Fix**: Apply default payment terms (30 days) to dueDate during import if not present.

### 11. VAT Amount Display Formatting
**Scope**: Sales Report
- "CHF-0.03" — no space between currency and negative sign.
- **Fix**: Update `formatCurrency()` to handle negative amounts with proper spacing.

### 12. User Name Display Inconsistency
**Scope**: Header/Nav
- User menu sometimes shows "User" and sometimes "Georgy Butaev" — race condition in session loading.
- **Fix**: Ensure session callback consistently returns user name.

### 13. AI Model Selector Shows "Select model (disabled)" vs "Llama 3.3 70B Free"
**Scope**: AI Chat panel
- AI model selector alternates between disabled "Select model" and "Llama 3.3 70B Free" — inconsistent state.
- No API keys configured for premium models (Anthropic/OpenAI), so only free Ollama/OpenRouter available.
- **Fix**: Show clear message when no API keys are configured; handle model selection gracefully.

---

## P3 — Low (Nice-to-have Improvements)

### 14. All Products Show "Out of Stock"
**Scope**: /products
- Every single product shows "Out of Stock" — stock levels weren't imported or all set to 0.
- This makes the products page look broken even though the data is there.

### 15. Projects Have No Dates/Budget/Client
**Scope**: /projects
- All 5 imported projects show "-" for client, budget, start date, end date.
- Project data from Kivitendo was sparse — only name and number were imported.

### 16. Document Number Format Mismatch
**Scope**: All document lists
- Old Kivitendo numbers (9899, 9898) coexist with new Kivvi format (R2026062, R2026061).
- Creates visual confusion in lists.
- Imported Kivitendo documents should ideally keep their original number format.

### 17. Dashboard "Workflow Suggestions" Shows "vor 0 Tagen geliefert"
**Scope**: Dashboard
- Orders show "wurde vor 0 Tagen geliefert" — these are historical orders from 2007-2013 that were imported with status "delivered" and recent updatedAt timestamps.

---

## Code Quality Observations

### 18. Contact Search Uses Client-Side Search Without URL Sync
The contact search input has `textbox "Search contacts..."` but typing doesn't push to URL params. The server-side search works via `?search=` query param but the client doesn't sync.

### 19. Documents Hub Shows All 2713 Docs Without Clear Dedup
Documents hub at `/documents` shows 2713 total (invoices + orders + purchase invoices) with no filtering by default. The duplicate invoices inflate the count.

### 20. No Loading States on Some Page Navigations
Page transitions (clicking sidebar links) don't show loading skeletons consistently — some pages just show blank content area while loading (Fast Refresh messages confirm 3-10 second load times).

---

## Staged Fix Plan

### Stage 1: Data Cleanup (Prerequisite for everything)
1. Write deduplication script to merge/remove duplicate products (by articleNumber + name)
2. Remove duplicate invoices (R2026xxx copies that lack customer linkage)
3. Remove duplicate warehouse
4. Remove duplicate stock levels
5. Fix invoice line items — re-parse from Kivitendo format or populate from source data

### Stage 2: Critical Bug Fixes
1. Fix dashboard database connection error in health-metrics
2. Fix contact search input to push to URL params (debounced)
3. Fix inconsistent overdue status calculation (documents hub vs invoices page)
4. Investigate and fix login form hanging/slow redirect

### Stage 3: Translation & i18n
1. Add all missing translation keys (settings.billing.*, settings.dataPrivacy.*, common.export, common.dashboard)
2. Ensure consistent locale usage — don't mix German and English on same page
3. Fix currency formatting for negative amounts (space before minus)

### Stage 4: Polish & UX
1. Fix Recharts responsive container for Revenue Trend
2. Fix user name race condition in header
3. Add loading skeletons to remaining pages
4. Fix AI model selector to handle missing API keys gracefully
5. Review import pipeline for idempotency to prevent future duplicate imports
