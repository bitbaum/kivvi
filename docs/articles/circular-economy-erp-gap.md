# The Circular Economy Has a Software Problem

_The tools that help a repair shop track a donated laptop from intake to sale don't exist. Here's why that matters — and what it's going to cost everyone._

---

Every year, 62 million tonnes of electronic waste are generated globally. Switzerland alone collects 121,000 tonnes of discarded electrical and electronic equipment annually through SENS and SWICO — one of the highest per-capita collection rates in the world. Most of it is recycled. A much smaller fraction is refurbished and reused. The gap between those two numbers represents an enormous amount of unnecessary manufacturing, unnecessary carbon, and unnecessary expense.

The refurbished electronics market is growing fast: from USD 86 billion in 2023 toward USD 169 billion by 2029, at a compounding 13–15% annually. The European secondhand market as a whole grew 20.8% year-over-year in 2024, now representing EUR 102 billion in gross merchandise value. Back Market — the largest marketplace for certified refurbished devices — grew its GMV to EUR 3 billion in 2025 and now has 2,700 vetted refurbisher partners across 18 markets.

The demand is there. The infrastructure is building. The regulation is arriving.

What is conspicuously absent is software.

---

## What a Circular Economy Business Actually Does

To understand the software gap, you have to understand what operating a repair, refurbishment, or secondhand business actually involves — because it is fundamentally different from what any existing ERP was designed to handle.

A linear business buys goods at a known condition and price, sells them, and tracks inventory as quantities. The item that enters the warehouse is the same item that leaves. The ERP's job is to count things and generate invoices.

A circular business does something categorically different. It takes in goods of unknown condition, unknown origin, and unknown value. A donation arrives. It might be a working laptop, a broken one, or something in between. Before it can be sold, it must be assessed — and that assessment is itself a skilled workflow, not a checkbox. What is the battery health? Does the storage drive pass SMART diagnostics? Has data been securely erased? What condition grade does it earn: like new, good, fair, poor, or parts only?

Then it may need repair. The repair has a cost. The repair has hours. It may succeed or fail. A device that fails repair may be routed to parts harvesting or recycling rather than resale. After repair, it should be re-tested — because the act of repairing something doesn't guarantee it's ready for sale.

Only after all of this does the standard ERP story begin: price it, list it, sell it, invoice it.

The existing software ecosystem handles the last three steps well. The first seven steps — intake, condition assessment, testing, routing, repair, erasure, re-testing — are handled by spreadsheets, paper forms, and institutional memory.

---

## Why Every Existing ERP Gets This Wrong

The world's ERP vendors have broadly failed to address this workflow, each for structural reasons.

**Bexio** is the dominant Swiss SME accounting product, used by over 100,000 businesses, with 1,300 certified accountant partners and Swissdec-certified payroll. For a Swiss service business or retail shop, it is an excellent product. But it has no concept of individual item tracking — inventory is managed as fungible quantities. A Brockenhaus managing 500 donated items of varying condition and origin cannot differentiate between them at the item level. There is no condition grade, no repair history, no individual item lifecycle.

**SAP Business One** has a genuine service module — equipment cards, service calls, warranty contracts, work orders — that handles repair workflows with real sophistication. But a basic implementation costs EUR 40,000–80,000 and takes three to six months. It was designed for B2B manufacturers and capital equipment service companies, not for a 20-person nonprofit in Zurich processing donated laptops. The tool is too powerful and too expensive in the wrong direction.

**Odoo** comes closest in the general-purpose category. It has a repair module that handles parts-in, parts-out, labor costs, and device history. Its inventory supports serial and lot tracking. But the repair module assumes a known product being repaired against a known repair order — it does not handle intake of an unknown-condition device, does not have a checklist-driven testing workflow, does not have condition grading, and does not have the routing logic that sends a device with a failing storage test to repair rather than to the sales floor. Building these workflows on Odoo requires EUR 50,000–150,000 in customization, per market estimates for circular economy implementations.

**Kivitendo** — the German open-source ERP dominant among Swiss and German SMEs — is the closest thing to a working solution for this sector. It has mature accounting, purchase workflows, time tracking, and SEPA support. Its Swiss variant includes QR-bill generation and the standard Swiss chart of accounts. But it has no condition grading, no checklist-driven testing, no repair queue, no individual item lifecycle. It handles the business's back-office. The operational workflow — the actual act of turning a donated laptop into a sellable product — lives outside it.

The repair shop category (RepairShopr, RepairDesk, Fixably) handles the middle of the workflow well: intake tickets, technician assignment, parts tracking, customer communication. But these tools are not ERPs. They do not generate Swiss QR-bill invoices, they do not do double-entry accounting, they do not handle VAT margin schemes for used goods, they do not produce balance sheets.

The consignment software category (ConsignCloud, SimpleConsign) handles donor/consignor management and item splitting well. But they have no repair capability and no accounting depth.

Nobody has connected these pieces.

---

## The Regulatory Window

This software gap was a problem before. It is becoming an urgent problem because of three converging regulatory changes.

**The EU Right to Repair Directive (2024/1799)** entered into force on July 30, 2024, with member state implementation required by July 31, 2026. It requires manufacturers of smartphones, laptops, washing machines, displays, and other products to make spare parts available at reasonable prices within 15 days, for periods of 7–10 years after last manufacture. It prohibits software or hardware locks that obstruct independent repair. It prohibits contracts that penalize consumers for using independent repairers. It entitles consumers to an additional year of warranty if they choose repair over replacement.

The structural effect is straightforward: more devices will be repaired. Spare parts that were previously unavailable or prohibitively priced will be legally required to exist. The market for independent repair will expand. Organizations already operating in this space — repair shops, refurbishers, Brockenhäuser — will see more volume and face higher quality expectations.

Higher volume requires better operational software. "We use spreadsheets" does not scale.

**The EU Ecodesign for Sustainable Products Regulation (ESPR, 2024/1781)** introduces the Digital Product Passport — a machine-readable record attached to every product sold in the EU, containing material composition, carbon footprint, repair history, spare parts availability, and end-of-life guidance. The DPP must be updated throughout the product's life, including through repair and refurbishment events. For electronics and ICT products, the DPP requirement takes effect between 2028 and 2029.

This is structurally an ERP problem. A refurbisher receiving a device, testing it, repairing it, and selling it must log those actions in a way that updates the device's DPP. That is not a spreadsheet function. It is a database function, connected to a supply chain record, traceable by serial number, with a timestamp and a responsible party.

**GDPR and the Swiss nDSG** — Switzerland's new data protection act, in force September 2023 — create explicit legal liability for organizations handling secondhand devices that contain personal data. A factory reset is not legally sufficient. Organizations must provide verifiable certificates of data destruction, following standards like NIST SP 800-88 or DIN 66399. Under the nDSG, individual managers and directors can be personally fined up to CHF 250,000 for intentional violations. This is not a risk that can be managed through institutional goodwill.

For any organization refurbishing electronics, data erasure is not a checkbox — it is a compliance function that requires a verifiable record attached to each device. That record needs to be generated, stored, and retrievable. That is, again, an ERP function.

---

## The Impact That Can't Be Measured

Circular economy organizations — nonprofits, social enterprises, repair collectives — have a story to tell that no ERP currently helps them tell.

A refurbished laptop produces 6.34% of the CO2 emissions of a new one, according to a Cranfield University study commissioned by Circular Computing. Each refurbished device saves approximately 316 kg of CO2-equivalent and 190,000 liters of water. A refurbished smartphone produces 91.6% less carbon than a new one, per Back Market's ISO-14064-certified lifecycle assessments. Back Market estimates it has avoided 1.5 million US tons of CO2e since its founding in 2014.

These are not small numbers. They are real, measurable, and increasingly demanded by funders, donors, customers, and regulators. Switzerland is proposing to expand CSRD-equivalent sustainability reporting requirements from approximately 300 companies to approximately 3,500, effective January 2026. Organizations operating in the circular economy will be asked to demonstrate their impact, not describe it.

None of the existing ERP products calculate CO2 saved per item sold. None of them aggregate repair success rates across device categories. None of them produce impact reports alongside financial reports. The Restart Project, which has logged over 208,000 repair attempts across 31 countries using its Fixometer platform, uses a separate open-source tool specifically because no ERP supports this data.

An impact-native ERP would calculate CO2e saved automatically, using published lifecycle assessment data, at the point of sale. It would produce a donor-facing receipt that says: "The 3 laptops you donated last month have been repaired and sold. Together they avoided 948 kg of CO2e — equivalent to 6,000 km of driving."

That receipt does not exist today.

---

## What Good Software for This Space Looks Like

The requirements are not exotic. They are specific, and they are derivable from first principles.

**Individual item tracking is the foundation.** Every item that enters the organization has a unique identity — an item number, a condition grade, a history. This is not serial number tracking in the traditional ERP sense (tracking a known SKU against a serial number). It is tracking an item whose identity and value are discovered through the intake process.

**Condition grading must be structured and consistent.** "Good" means something specific: visible signs of wear, 80%+ battery capacity. "Like new" means something different. The grading must be done against a defined standard, not against intuition. That standard must be applied consistently across technicians and over time.

**Testing must be checklist-driven and category-specific.** A laptop checklist is not the same as a bike checklist. The tests for a smartphone are different from the tests for a washing machine. The checklist should be the operative document — what was tested, what passed, what failed, who did the testing, when.

**Quality gates must be enforced, not advisory.** An item with a failing storage SMART test should not be approvable for sale. An item without a confirmed data erasure should not be sellable. These are not reminders — they are structural constraints in the workflow.

**Repair tracking must attribute cost to the item.** When a technician spends 2.5 hours and 40 CHF in parts repairing a laptop, that cost must be attached to that specific item. The margin at point of sale is calculated against acquisition cost plus repair cost. If that margin is negative, the business needs to know.

**Swiss compliance must be native, not a plugin.** QR-bill generation, CHF Rappen rounding, Swiss VAT rates including the margin scheme for used goods, 10-year document retention per OR Article 958f — these are legal requirements, not preferences. They should be present from onboarding, not configured by a consultant.

**Impact must be first-class data.** CO2 saved per device, repair success rate by category, average cost-to-repair by condition grade, devices diverted from recycling — these are the numbers that matter to the organizations operating in this sector. They should be queryable, reportable, and shareable without a data export.

---

## The Opportunity, Stated Plainly

Switzerland has 609+ Brockenhäuser. It has a government that has committed CHF 12 million to support circular economy organizations. It has one of the highest e-waste collection rates in Europe and infrastructure through SENS and SWICO that processes 121,000 tonnes annually. It has organizations like revamp-it that have been refurbishing computers since 2003, employing people with barriers to traditional employment, and contributing to open-source software because no commercial software served them.

Across Europe, Back Market has 2,700 refurbisher partners generating EUR 3 billion in annual GMV — every one of them managing their operational workflow outside of any integrated system. The EU Right to Repair Directive takes effect in July 2026 and will structurally expand the repair market. The Digital Product Passport requirement will create a data management obligation for every organization handling secondhand electronics. The Swiss nDSG creates personal liability for data erasure failures.

The market is real. The regulation is arriving. The software does not exist.

That is the definition of a problem worth solving.

---

_Kivvi is an open-source ERP built specifically for businesses that handle secondhand, donated, and refurbished goods. It is developed by and for the circular economy sector, Swiss-native, and designed to handle the complete workflow from intake to impact report. It is free to use and free to extend._
