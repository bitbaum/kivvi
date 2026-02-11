================================================================================
  KIVITENDO ERP DATA EXPORT - revamp-it, Zurich
================================================================================

  Source:       https://revamp.kivitendo.ch/kivitendo-erp/
  Instance:     revamp produktiv (kivitendo v3.9.2-beta)
  Exported:     2026-02-11
  Data range:   2007 - 2026-02-11

  Organization: revamp-it, Zurich
  Currency:     CHF (Swiss Francs)
  Chart:        Swiss KMU chart of accounts (Kontenrahmen KMU)
  Tax setup:    No VAT (0% tax rates only - nonprofit/exempt entity)
  Format:       CSV, UTF-8, comma-separated, double-quoted fields
  Number format: Swiss (apostrophe as thousands separator, e.g. 5'007.20)

================================================================================
  FILES OVERVIEW
================================================================================

  19 CSV files, 7.6 MB total

  MASTER DATA (who you do business with, what you sell):
  -------------------------------------------------------
  kunden_customers.csv              5,803 records   828 KB
  lieferanten_vendors.csv             496 records    64 KB
  artikel_products.csv              4,134 records   976 KB

  TRANSACTIONS (what happened):
  -------------------------------------------------------
  rechnungen_ar_invoices.csv        2,777 records   584 KB
  einkaufsrechnungen_ap_invoices.csv 1,471 records  392 KB
  auftraege_sales_orders.csv        2,466 records   2.2 MB
  angebote_quotes.csv                 175 records   220 KB
  lieferscheine_delivery_notes.csv  3,325 records   524 KB
  buchungsjournal_gl.csv            9,333 records   1.7 MB

  FINANCIAL REPORTS (summaries and balances):
  -------------------------------------------------------
  summen_saldenliste_trial_balance.csv    103 records   8 KB
  offene_forderungen_open_receivables.csv 1,135 records 80 KB
  offene_verbindlichkeiten_open_payables.csv  37 records 4 KB

  INVENTORY:
  -------------------------------------------------------
  lagerbestand_warehouse_stock.csv    406 records    64 KB

  CONFIGURATION (system settings):
  -------------------------------------------------------
  kontenplan_chart_of_accounts.csv    158 accounts    8 KB
  steuern_taxes.csv                     1 entries     4 KB
  steuerzonen_tax_zones.csv             3 zones       4 KB
  zahlungsbedingungen_payment_terms.csv 17 terms      8 KB
  buchungsgruppen_posting_groups.csv   11 groups      4 KB
  projekte_projects.csv                 4 projects    4 KB


================================================================================
  DETAILED FILE DESCRIPTIONS
================================================================================


--- kunden_customers.csv (Customers) -------------------------------------------

  What:   Complete customer master data.
  Use:    Migrate customer records to new system. Contains all contact details,
          addresses, payment terms, tax settings, and custom fields.
  Records: 5,803 customers
  Key columns:
    - Buchungsnummer     = Internal booking number
    - Firma/Kundenname   = Company/customer name
    - Nummer             = Customer number (your reference ID)
    - Kontakt            = Contact person
    - E-Mail             = Email address
    - Strasse, PLZ, Stadt, Land = Full address
    - Zahlungsbedingungen = Payment terms
    - Steuersatz         = Tax zone (Inland/EU/non-EU)
    - Erfassungsdatum    = Date created
    - Kreditlimit        = Credit limit
    - Mahnsperre         = Dunning block (Ja/Nein)


--- lieferanten_vendors.csv (Vendors/Suppliers) --------------------------------

  What:   Complete vendor/supplier master data.
  Use:    Migrate vendor records to new system.
  Records: 496 vendors
  Key columns:
    - Buchungsnummer     = Internal booking number
    - Lieferantenname    = Vendor name
    - Nummer             = Vendor number
    - E-Mail, Telefon, Fax = Contact details
    - Strasse, PLZ, Stadt, Land = Address
    - Zahlungsbedingungen = Payment terms
    - Steuersatz         = Tax zone


--- artikel_products.csv (Products/Articles) -----------------------------------

  What:   Complete product catalog with pricing, stock, and shop attributes.
  Use:    Migrate products to new system. Includes webshop fields, custom
          variables (vm_product_*), pricing tiers, and inventory data.
  Records: 4,134 products
  Key columns:
    - Artikelnummer      = Article/part number
    - Typ                = Type (Ware=goods, Dienstleistung=service, etc.)
    - Artikelbeschreibung = Description
    - Listenpreis        = List price
    - Verkaufspreis      = Selling price
    - Einkaufspreis      = Purchase price
    - Lagermenge         = Stock quantity
    - Einheit            = Unit of measure
    - Warengruppe        = Product group
    - Shopartikel        = Shop article (yes/no)
    - Preisgruppe *      = Price group tiers
    - vm_product_*       = Custom fields (shop categories, dimensions, etc.)


--- rechnungen_ar_invoices.csv (Sales Invoices / AR) ---------------------------

  What:   All accounts receivable invoices (sales side), both open and paid.
  Use:    Migrate invoice history, calculate revenue, analyze payment behavior.
          Each row is one line item (Positionen), so multiple rows per invoice.
  Records: 2,777 line items
  Key columns:
    - Datum              = Invoice date
    - Rechnung           = Invoice number
    - Kunde              = Customer name
    - Betrag             = Net amount
    - Steuer             = Tax amount
    - Summe              = Gross amount
    - bezahlt            = Amount paid
    - Zahlungsdatum      = Payment date
    - Betrag faellig     = Amount due
    - Faelligkeitsdatum  = Due date
    - Mahnstufe          = Dunning level
    - Positionen         = Line item details


--- einkaufsrechnungen_ap_invoices.csv (Purchase Invoices / AP) ----------------

  What:   All accounts payable invoices (purchase side), both open and paid.
  Use:    Migrate purchase history, analyze spending by vendor.
  Records: 1,471 line items
  Key columns:
    - Datum              = Invoice date
    - Rechnung           = Invoice number
    - Lieferant          = Vendor name
    - Betrag             = Net amount
    - Summe              = Gross amount
    - bezahlt            = Amount paid
    - Betrag faellig     = Amount due
    - Faelligkeitsdatum  = Due date
    - Positionen         = Line item details


--- auftraege_sales_orders.csv (Sales Orders) ----------------------------------

  What:   All sales orders with full details.
  Use:    Migrate order history, analyze fulfillment rates.
  Records: 2,466 orders
  Key columns:
    - Datum              = Order date
    - Auftrag            = Order number
    - Bestellnummer des Kunden = Customer PO number
    - Kunde              = Customer name
    - Betrag / Summe     = Net / Gross amounts
    - Offen              = Open (yes/no)
    - Lieferschein erstellt = Delivery note created
    - Positionen         = Line items


--- angebote_quotes.csv (Sales Quotations) -------------------------------------

  What:   All sales quotations/offers.
  Use:    Migrate quote history, analyze conversion rates.
  Records: 175 quotes
  Key columns:
    - Datum              = Quote date
    - Gueltig bis        = Valid until
    - Angebot            = Quote number
    - Kunde              = Customer
    - Summe              = Total amount
    - Auftragswahrscheinlichkeit = Order probability
    - Status             = Quote status


--- lieferscheine_delivery_notes.csv (Delivery Notes) --------------------------

  What:   All delivery notes (outbound shipments).
  Use:    Migrate delivery history, verify order fulfillment.
  Records: 3,325 delivery notes
  Key columns:
    - Lieferscheindatum  = Delivery date
    - Lieferschein       = Delivery note number
    - Auftrag            = Related order number
    - Kunde              = Customer
    - Offen              = Open (yes/no)
    - Geliefert          = Delivered (yes/no)
    - Positionen         = Line items


--- buchungsjournal_gl.csv (General Ledger Journal) ----------------------------

  What:   Complete general ledger with every booking entry (2007-2026).
  Use:    This is the most important file for accounting migration. Contains
          every debit/credit posting with accounts, dates, and references.
          Can be used to reconstruct the entire accounting history.
  Records: 9,333 journal entries
  Key columns:
    - Buchungsdatum      = Posting date
    - Erfassungsdatum    = Entry date
    - Buchungsnummer     = Transaction number
    - Referenz           = Reference
    - Beschreibung       = Description
    - Soll               = Debit amount
    - Sollkonto          = Debit account
    - Haben              = Credit amount
    - Habenkonto         = Credit account
    - Projektnummern     = Project numbers


--- summen_saldenliste_trial_balance.csv (Trial Balance) -----------------------

  What:   Trial balance as of 31.12.2026 with opening balances and YTD totals.
  Use:    Verify account balances, set up opening balances in new system.
  Records: 103 account lines
  Key columns:
    - Konto              = Account number
    - Beschreibung       = Account name
    - Eroeffnungsbilanzwerte = Opening balance (Aktiva/Passiva = Assets/Liab.)
    - Summe fuer 01.01-31.12.2026 = YTD totals (Soll/Haben = Debit/Credit)
    - Saldo per 31.12.2026 = Balance as of year-end


--- offene_forderungen_open_receivables.csv (Open Receivables / AR Aging) ------

  What:   All open (unpaid) customer invoices as of export date.
  Use:    Set up opening AR balances in new system, follow up on collections.
  Records: 1,135 open invoices
  Key columns:
    - Kunde              = Customer name
    - Rechnung           = Invoice number
    - Datum              = Invoice date
    - Faellig            = Due date
    - Betrag             = Invoice amount
    - Offen              = Open/outstanding amount
    - Hinweis            = Notes


--- offene_verbindlichkeiten_open_payables.csv (Open Payables / AP Aging) ------

  What:   All open (unpaid) vendor invoices as of export date.
  Use:    Set up opening AP balances in new system, plan payments.
  Records: 37 open invoices
  Key columns:
    - Lieferant          = Vendor name
    - Rechnung           = Invoice number
    - Faellig            = Due date
    - Betrag             = Invoice amount
    - Offen              = Open/outstanding amount


--- lagerbestand_warehouse_stock.csv (Warehouse Inventory) ---------------------

  What:   Current warehouse stock levels with locations and valuations.
  Use:    Set up inventory in new system, verify stock counts.
  Records: 406 stock entries
  Key columns:
    - Lager              = Warehouse name
    - Lagerplatz         = Bin/location
    - Artikelnummer      = Article number
    - Artikelbeschreibung = Description
    - Menge              = Quantity on hand
    - Einheit            = Unit
    - Listenpreis        = List price
    - EK-Preis           = Purchase price
    - Bestandswert       = Stock value
    - BesitzerIn         = Owner


--- kontenplan_chart_of_accounts.csv (Chart of Accounts) -----------------------

  What:   Full chart of accounts (Swiss KMU standard).
  Use:    Map accounts to new system's chart of accounts.
  Records: 158 accounts
  Key columns:
    - Konto              = Account number (Swiss KMU numbering)
    - Beschreibung       = Account name
    - Soll / Haben       = Debit / Credit indicators

  Account structure (Swiss KMU):
    1xxx = Assets (Aktiven)
    2xxx = Liabilities & Equity (Passiven)
    3xxx = Revenue (Ertrag)
    4xxx = Cost of goods/materials (Material-/Warenaufwand)
    5xxx = Personnel costs (Personalaufwand)
    6xxx = Operating expenses (Betriebsaufwand)
    8xxx = Extraordinary items & taxes
    9xxx = Closing accounts


--- steuern_taxes.csv (Tax Rates) ----------------------------------------------

  What:   Tax configuration. This instance uses 0% tax only.
  Use:    Understand the tax setup (no VAT applied - likely exempt entity).
  Records: 1 tax entry


--- steuerzonen_tax_zones.csv (Tax Zones) --------------------------------------

  What:   Geographic tax zones for applying different tax rules.
  Use:    Map to new system's tax regions.
  Zones:  Inland, EU mit USt-ID, EU ohne USt-ID, Ausserhalb EU


--- zahlungsbedingungen_payment_terms.csv (Payment Terms) ----------------------

  What:   All payment term definitions with texts for quotes and invoices.
  Use:    Recreate payment terms in new system.
  Records: 17 payment terms
  Examples: bar beim Abholen, Vorauszahlung, innert 10 Tagen, bei Erhalt,
            jaehrlich im Voraus, Tauschen am Fluss, Talent, PayPal, SEPA

  Bank details in terms:
    Postkonto: 87-250971-7
    IBAN: CH16 0900 0000 8725 0971 7
    PayPal: empfang@revamp-it.ch
    Talent Schweiz account: 1928ts
    Tauschen am Fluss account: Verein revamp-it


--- buchungsgruppen_posting_groups.csv (Posting Groups) ------------------------

  What:   Defines which revenue/expense accounts to use per product type
          and tax zone. Links products to the chart of accounts.
  Use:    Map product categories to accounts in new system.
  Records: 11 posting groups
  Groups: Reparaturen, Dienstleistungen, Warenverkauf, Liftbenutzung,
          Externe Arbeiten, Ausserordentliches, Versandspesen, Spenden,
          Integrations-Arbeitsplaetze, Mitgliederbeitraege,
          Richtpreis-Aufstockung, Richtpreis-Reduzierung


--- projekte_projects.csv (Projects) ------------------------------------------

  What:   Project definitions for cost tracking.
  Use:    Recreate project structure in new system.
  Records: 4 projects
  Projects: ltsp-revamp-it, SocialMarket, Kivitendo,
            LTSP-Server revamp, Kivitendo Modus Schweiz


================================================================================
  MIGRATION NOTES
================================================================================

  1. NUMBER FORMAT
     Swiss number format uses apostrophe for thousands: 5'007.20
     You may need to strip apostrophes before importing to other systems:
       sed "s/'//g" file.csv > file_clean.csv

  2. DATE FORMAT
     All dates are DD.MM.YYYY (European/Swiss format): 22.01.2026
     Convert to ISO if needed: 2026-01-22

  3. ENCODING
     Files are UTF-8. Some have a BOM marker (byte order mark) at the start.
     German special characters are present: ae=ae, oe=oe, ue=ue, ss=ss

  4. EMPTY FIRST COLUMNS
     Some files have an empty first column ("") - this is from kivitendo's
     checkbox column in the UI. You can safely ignore or strip it.

  5. LINE ITEMS vs HEADERS
     Invoice and order files contain one row per LINE ITEM, not per document.
     Multiple rows share the same invoice/order number. Summary rows may
     appear with subtotals.

  6. RELATIONSHIPS BETWEEN FILES
     - Customers (kunden) link to AR invoices, orders, quotes, delivery notes
       via customer name/number
     - Vendors (lieferanten) link to AP invoices via vendor name/number
     - Products (artikel) link to warehouse stock via article number
     - GL journal references accounts from the chart of accounts
     - Posting groups define the account mapping for products
     - Payment terms are referenced by name in customer/vendor records

  7. ALTERNATIVE CURRENCIES
     This organization also uses:
     - Tauschen am Fluss (local exchange hours)
     - Talent Schweiz (complementary currency)
     Some transactions may be denominated in these alternative currencies.

  8. KEY ACCOUNT BALANCES (from trial balance, per 31.12.2026)
     Cash (1001 Kasse):          CHF  28,427.55
     Post account (1020):        CHF 134,802.37
     PayPal (1031):              CHF   4,623.92
     Receivables (1100):         CHF  19,611.84
     Payables (2000):            CHF   7,658.13 (credit)
     Revenue goods (3100):       CHF  85,542.95
     Revenue services (3400):    CHF 206,200.91
     Donations received (3500):  CHF  10,844.35
     Rent expense (6000):        CHF  76,933.75
     Wages (5000):               CHF  39,737.80

================================================================================
  EXTRACTION METHOD
================================================================================

  Data was extracted on 2026-02-11 using browser automation (Playwright)
  against the live kivitendo web interface. Each report page was navigated to,
  all columns/checkboxes enabled, all date filters cleared, and the resulting
  HTML tables were converted to CSV.

  The customers file was downloaded directly via kivitendo's built-in CSV
  export function.

  Source system: kivitendo v3.9.2-beta (Perl + PostgreSQL)

================================================================================
